#!/usr/bin/env python3
"""
Prueba de inyección de fallos del runner (VLT-01). ATLAS-TECH (AP-03), 2026-10-23. OFFLINE, sin red ni secretos.

Objetivo: demostrar que run_core1_checks.py NO oculta errores. Cada caso inyecta un fallo en una COPIA temporal del
layout y exige que el runner lo detecte. También reproduce el defecto original (python | tail -1 devuelve 0) como evidencia.
Sale con 0 solo si TODAS las inyecciones fueron detectadas y el control positivo pasa.

Uso: python3 -I core1-price/runners/test_runner_fault_injection.py
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))

spec = importlib.util.spec_from_file_location("run_core1_checks", os.path.join(HERE, "run_core1_checks.py"))
R = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R)

results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))


def fresh_root():
    t = tempfile.mkdtemp(prefix="core1-fault-")
    os.makedirs(os.path.join(t, "versions"))
    for d in ("v2.2.2", "v2.2.1", "v2.2", "v2.1", "consumer-adapter-v1", "consumer-adapter-v1.1"):
        shutil.copytree(os.path.join(ROOT, "versions", d), os.path.join(t, "versions", d))
    return t


def models_file(root, folder="v2.2.1"):
    d = os.path.join(root, "versions", folder)
    for n in os.listdir(d):
        if n.startswith("core1_reference_model") and n.endswith(".inert"):
            return os.path.join(d, n)


def vectors_file(root, folder="v2.2.1"):
    d = os.path.join(root, "versions", folder)
    for n in os.listdir(d):
        if n.startswith("CORE1-BASE-PRICE-REGRESSION") and n.endswith(".json"):
            return os.path.join(d, n)


def expect_detected(name, root, fn):
    try:
        problems = fn(root)
    finally:
        shutil.rmtree(root, ignore_errors=True)
    record(name, bool(problems), problems[0] if problems else "NO DETECTADO")


# 0. Evidencia del defecto original: una tubería oculta el código de salida del proceso de la izquierda
p = subprocess.run(["sh", "-c", "python3 -c 'import sys; sys.exit(7)' | tail -1"], capture_output=True, text=True)
record("EVIDENCIA VLT-01: 'python | tail -1' devuelve 0 aunque python salga con 7", p.returncode == 0, f"código de la tubería = {p.returncode}")

# 1. Control positivo: layout intacto => el runner debe pasar
root = fresh_root()
probs = R.check_models(root) + R.check_adapter(root) + R.check_adapter11(root)
shutil.rmtree(root, ignore_errors=True)
record("CONTROL: layout intacto pasa", not probs, "; ".join(probs))

# 2. El modelo sale con código 7 (sin imprimir nada)
root = fresh_root()
open(models_file(root), "w").write("import sys\nsys.exit(7)\n")
expect_detected("modelo sale con 7", root, R.check_models)

# 3. El modelo imprime el resumen correcto pero sale con 1 (el caso que una tubería ocultaría)
root = fresh_root()
orig = open(models_file(root)).read()
open(models_file(root), "w").write(orig.replace("    return 0 if ok == len(rows) else 1", "    return 1"))
expect_detected("modelo imprime todo OK pero sale con 1", root, R.check_models)

# 4. Un oráculo cambia: un caso falla
root = fresh_root()
vf = vectors_file(root)
d = json.load(open(vf))
d["cases"][0]["expected"]["payment_total"] = "999.99"
json.dump(d, open(vf, "w"))
expect_detected("un caso FAIL por oráculo alterado", root, R.check_models)

# 5. Falta un caso (conteo)
root = fresh_root()
vf = vectors_file(root)
d = json.load(open(vf))
d["cases"].pop()
json.dump(d, open(vf, "w"))
expect_detected("conteo de casos distinto del esperado", root, R.check_models)

# 6. ID duplicado
root = fresh_root()
vf = vectors_file(root)
d = json.load(open(vf))
d["cases"][1]["id"] = d["cases"][0]["id"]
json.dump(d, open(vf, "w"))
expect_detected("ID de caso duplicado", root, R.check_models)

# 7. Falta el archivo del modelo
root = fresh_root()
os.remove(models_file(root))
expect_detected("falta el modelo", root, R.check_models)

# 8. El modelo sale con 0 pero no imprime resumen
root = fresh_root()
open(models_file(root), "w").write("print('nada')\n")
expect_detected("sin línea resumen (salida 0)", root, R.check_models)

# 9. El resumen declara menos casos que los esperados
root = fresh_root()
orig = open(models_file(root)).read()
open(models_file(root), "w").write(orig.replace('print(f"FILE {path.split(\'/\')[-1]} : {ok}/{len(rows)} cases', 'print(f"FILE {path.split(\'/\')[-1]} : {ok-1}/{len(rows)-1} cases'))
expect_detected("resumen con conteo menor", root, R.check_models)

# 10. VLT-02: falta el motor v2.1 que el adaptador necesita en su layout
root = fresh_root()
shutil.rmtree(os.path.join(root, "versions", "v2.1"))
expect_detected("adaptador sin v2.1 en el layout (VLT-02)", root, R.check_adapter)

# 11. El servidor del adaptador sale con 5 aunque imprima el resumen correcto
root = fresh_root()
scen = os.path.join(root, "versions", "consumer-adapter-v1", "tests", "run_server_scenarios.py.inert")
open(scen, "w").write("import sys\nprint('SERVER SCENARIOS (simulated): 31/31 PASS; failing=[]')\nsys.exit(5)\n")
expect_detected("servidor del adaptador sale con 5 pese al resumen", root, R.check_adapter)

# 12. Cliente del adaptador con resumen menor
root = fresh_root()
cl = os.path.join(root, "versions", "consumer-adapter-v1", "tests", "run_client_tests.mjs.inert")
open(cl, "w").write("console.log('CLIENT TESTS (simulated DTOs): 27/28 PASS; failing=[\"x\"]');\nprocess.exit(0);\n")
expect_detected("cliente del adaptador con 27/28", root, R.check_adapter)

# 13. El fixture congelado y el regenerado difieren
root = fresh_root()
fx = os.path.join(root, "versions", "consumer-adapter-v1", "fixtures", "generated-dtos.json")
# se altera el fixture congelado; el simulador regenera uno distinto dentro de la copia temporal
orig_fx = open(fx, "rb").read()
frozen_alt = tempfile.mkdtemp(prefix="core1-frozen-")
shutil.copytree(os.path.join(root, "versions"), os.path.join(frozen_alt, "versions"))
open(os.path.join(frozen_alt, "versions", "consumer-adapter-v1", "fixtures", "generated-dtos.json"), "wb").write(orig_fx + b" ")
shutil.rmtree(root, ignore_errors=True)
probs = R.check_adapter(frozen_alt)
shutil.rmtree(frozen_alt, ignore_errors=True)
record("fixture congelado alterado se detecta", any("difieren" in x for x in probs), probs[0] if probs else "NO DETECTADO")

# 14-19. Adapter v1.1: cada fallo inyectado debe detectarse
def a11(root, rel):
    return os.path.join(root, "versions", "consumer-adapter-v1.1", *rel.split("/"))

root = fresh_root()
os.remove(a11(root, "tests/run_server_scenarios.py.inert"))
expect_detected("adapter v1.1: falta el script de servidor", root, R.check_adapter11)

root = fresh_root()
p_ = a11(root, "server/consumer_server_sim.py.inert")
t_ = open(p_).read(); needle = '"channel": None, "booking_enablement": {"derived_from_reference": False'
assert needle in t_, "mutation target missing"
t_ = t_.replace(needle, '"channel": None, "booking_enablement": {"derived_from_reference": True')
open(p_, "w").write(t_)
expect_detected("adapter v1.1: habilitación derivada solo en DTO sin precio (mutación) se detecta", root, R.check_adapter11)

root = fresh_root()
p_ = a11(root, "server/consumer_server_sim.py.inert")
open(p_, "w").write(open(p_).read().replace('"derived_from_reference": False', '"derived_from_reference": True'))
expect_detected("adapter v1.1: habilitación derivada de la referencia en todos los DTO (mutación) se detecta", root, R.check_adapter11)

root = fresh_root()
p_ = a11(root, "server/consumer_server_sim.py.inert")
open(p_, "w").write(open(p_).read().replace('"provider_amount": None, "final_price_confirmed": None, "final_price_note"', '"provider_amount": None, "final_price_confirmed": "0.00", "final_price_note"'))
expect_detected("adapter v1.1: precio final confirmado inventado (mutación) se detecta", root, R.check_adapter11)

root = fresh_root()
p_ = a11(root, "server/consumer_server_sim.py.inert")
open(p_, "w").write(open(p_).read().replace('if future:', 'if False:'))
expect_detected("adapter v1.1: instante futuro aceptado (mutación) se detecta", root, R.check_adapter11)

root = fresh_root()
p_ = a11(root, "tests/run_client_tests.mjs.inert")
open(p_, "w").write("console.log('CLIENT TESTS v1.1 (simulated DTOs): 24/24 PASS; failing=[]');\nprocess.exit(3);\n")
expect_detected("adapter v1.1: cliente sale con 3 pese al resumen", root, R.check_adapter11)

root = fresh_root()
shutil.rmtree(os.path.join(root, "versions", "v2.2.2"))
expect_detected("adapter v1.1: falta el motor v2.2.2 en el layout", root, R.check_adapter11)

bad = [r for r in results if not r[1]]
print(f"\nINYECCIÓN DE FALLOS: {len(results) - len(bad)}/{len(results)} comportamientos esperados (19 negativos + reproducción del defecto + control positivo)")
sys.exit(1 if bad else 0)
