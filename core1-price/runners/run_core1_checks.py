#!/usr/bin/env python3
"""
Runner de verificación OFFLINE de Core 1 en el layout del vault (VLT-01 / VLT-02).
Autor: ATLAS-TECH (AP-03), 2026-10-23. Estado: herramienta de pruebas, CANDIDATA (no adoptada).

Garantías (cada una está cubierta por runners/test_runner_fault_injection.py):
  * Sin tuberías: cada proceso hijo se ejecuta aparte y se evalúa su código de salida real.
  * Falla (código != 0) si: el proceso sale != 0, falta la línea resumen, el resumen no coincide con el conteo
    esperado, hay líneas FAIL, el número de casos del JSON difiere del esperado, hay IDs duplicados, o falta el archivo.
  * No modifica archivos congelados: el adaptador se ejecuta en una copia temporal con el layout que él espera.
  * Sin red, sin base de datos, sin secretos, sin instalar nada. No ejecuta audit:live.
  * Los resultados son de modelo/simulación: NO prueban SQL, Admin, portal ni producción.

Uso:  python3 -I core1-price/runners/run_core1_checks.py [--root RUTA_RAIZ_CORE1] [--only models|adapter]
Salida: 0 solo si TODO pasa. Cualquier otro caso => código distinto de 0.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_ROOT = os.path.abspath(os.path.join(HERE, ".."))

# (carpeta, modelo, vectores, casos esperados)
MODELS = [
    ("v2.2.3", "core1_reference_model_v2_2_3.py.inert", "CORE1-BASE-PRICE-REGRESSION-v2.2.3-ATLAS-TECH.json", 120),
    ("v2.2.2", "core1_reference_model_v2_2_2.py.inert", "CORE1-BASE-PRICE-REGRESSION-v2.2.2-ATLAS-TECH.json", 115),
    ("v2.2.1", "core1_reference_model_v2_2_1.py.inert", "CORE1-BASE-PRICE-REGRESSION-v2.2.1-ATLAS-TECH.json", 107),
    ("v2.2", "core1_reference_model_v2_2.py.inert", "CORE1-BASE-PRICE-REGRESSION-v2.2-ATLAS-TECH.json", 97),
]
SUMMARY_MODEL = re.compile(r"^FILE (\S+) : (\d+)/(\d+) cases match their own expected fields \(model only\)$", re.M)
SUMMARY_SERVER = re.compile(r"^SERVER SCENARIOS \(simulated\): (\d+)/(\d+) PASS; failing=\[\]$", re.M)
SUMMARY_CLIENT = re.compile(r"^CLIENT TESTS \(simulated DTOs\): (\d+)/(\d+) PASS; failing=\[\]$", re.M)


def run(cmd, cwd=None, timeout=300):
    """Ejecuta un proceso hijo SIN shell y SIN tubería. Devuelve (código, stdout, stderr)."""
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, shell=False)
        return p.returncode, p.stdout, p.stderr
    except FileNotFoundError as e:
        return 127, "", str(e)
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"


def check_models(root, models=MODELS, python=None):
    python = python or sys.executable
    problems = []
    for folder, model, vectors, expected in models:
        d = os.path.join(root, "versions", folder)
        mpath, vpath = os.path.join(d, model), os.path.join(d, vectors)
        tag = f"{folder}"
        for p in (mpath, vpath):
            if not os.path.isfile(p):
                problems.append(f"{tag}: falta archivo {os.path.relpath(p, root)}")
        if problems and problems[-1].startswith(tag + ": falta"):
            continue
        # el JSON se lee crudo (preserva 5.0 vs 5): conteo e IDs únicos
        try:
            cases = json.load(open(vpath))["cases"]
        except Exception as e:  # noqa: BLE001
            problems.append(f"{tag}: vectores ilegibles ({e.__class__.__name__})")
            continue
        ids = [c.get("id") for c in cases]
        if len(cases) != expected:
            problems.append(f"{tag}: {len(cases)} casos en JSON, se esperaban {expected}")
        if len(set(ids)) != len(ids):
            problems.append(f"{tag}: IDs de caso duplicados")
        code, out, err = run([python, "-I", mpath, vpath])
        if code != 0:
            problems.append(f"{tag}: el modelo salió con código {code}")
        m = SUMMARY_MODEL.search(out)
        if not m:
            problems.append(f"{tag}: falta línea resumen del modelo")
        else:
            ok, total = int(m.group(2)), int(m.group(3))
            if (ok, total) != (expected, expected):
                problems.append(f"{tag}: resumen {ok}/{total}, se esperaba {expected}/{expected}")
        passes = len(re.findall(r"^\S+ PASS\s*$", out, re.M))
        fails = [ln for ln in out.splitlines() if re.match(r"^\S+ FAIL", ln)]
        if fails:
            problems.append(f"{tag}: {len(fails)} casos FAIL")
        if passes != expected:
            problems.append(f"{tag}: {passes} líneas PASS, se esperaban {expected}")
        if not problems or not any(p.startswith(tag + ":") for p in problems):
            print(f"OK  {tag}: {expected}/{expected} (modelo vs vectores sintéticos)")
    return problems


def check_adapter(root, python=None, node="node"):
    """Ejecuta el adaptador congelado en una COPIA temporal con el layout que espera (resuelve VLT-02)."""
    python = python or sys.executable
    problems = []
    src_adapter = os.path.join(root, "versions", "consumer-adapter-v1")
    src_v21 = os.path.join(root, "versions", "v2.1")
    for p in (src_adapter, src_v21):
        if not os.path.isdir(p):
            return [f"adapter: falta carpeta {os.path.relpath(p, root)}"]
    tmp = tempfile.mkdtemp(prefix="core1-adapter-")
    try:
        ad = os.path.join(tmp, "core1-consumer-adapter-v1")
        shutil.copytree(src_adapter, ad)
        shutil.copytree(src_v21, os.path.join(tmp, "core1-price-v2.1"))
        sim = os.path.join(ad, "server", "consumer_server_sim.py.inert")
        text = open(sim).read()
        if "core1-price-v2.1" not in text:
            problems.append("adapter: el simulador ya no referencia core1-price-v2.1 (revisar el wrapper)")
        scen_src = os.path.join(ad, "tests", "run_server_scenarios.py.inert")
        scen = os.path.join(ad, "tests", "run_server_scenarios.py")
        shutil.copy(scen_src, scen)
        code, out, err = run([python, "-I", scen])
        if code != 0:
            problems.append(f"adapter/servidor: salió con código {code}")
        m = SUMMARY_SERVER.search(out)
        if not m:
            problems.append("adapter/servidor: falta línea resumen")
        elif (int(m.group(1)), int(m.group(2))) != (31, 31):
            problems.append(f"adapter/servidor: resumen {m.group(1)}/{m.group(2)}, se esperaba 31/31")
        client_dir = os.path.join(tmp, "client-run")
        os.makedirs(client_dir)
        shutil.copy(os.path.join(ad, "client", "core1PriceAdapter.mjs.inert"), os.path.join(client_dir, "core1PriceAdapter.mjs"))
        shutil.copy(os.path.join(ad, "tests", "run_client_tests.mjs.inert"), os.path.join(client_dir, "run_client_tests.mjs"))
        dtos = os.path.join(ad, "fixtures", "generated-dtos.json")
        code, out, err = run([node, os.path.join(client_dir, "run_client_tests.mjs"), dtos])
        if code != 0:
            problems.append(f"adapter/cliente: salió con código {code}")
        m = SUMMARY_CLIENT.search(out)
        if not m:
            problems.append("adapter/cliente: falta línea resumen")
        elif (int(m.group(1)), int(m.group(2))) != (28, 28):
            problems.append(f"adapter/cliente: resumen {m.group(1)}/{m.group(2)}, se esperaba 28/28")
        # determinismo: los DTO regenerados deben ser byte a byte los del fixture congelado
        if open(dtos, "rb").read() != open(os.path.join(src_adapter, "fixtures", "generated-dtos.json"), "rb").read():
            problems.append("adapter: los DTO regenerados difieren del fixture congelado")
        if not problems:
            print("OK  adapter: servidor 31/31 y cliente 28/28 (simulados) en layout vault; fixtures regenerados idénticos")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return problems


SUMMARY_SERVER11 = re.compile(r"^SERVER SCENARIOS v1\.1 \(simulated\): (\d+)/(\d+) PASS; failing=\[\]$", re.M)
SUMMARY_CLIENT11 = re.compile(r"^CLIENT TESTS v1\.1 \(simulated DTOs\): (\d+)/(\d+) PASS; failing=\[\]$", re.M)
SUMMARY_SERVER111 = re.compile(r"^SERVER SCENARIOS v1\.1\.1 \(simulated\): (\d+)/(\d+) PASS; failing=\[\]$", re.M)
SUMMARY_CLIENT111 = re.compile(r"^CLIENT TESTS v1\.1\.1 \(simulated DTOs\): (\d+)/(\d+) PASS; failing=\[\]$", re.M)


def check_adapter11(root, python=None, node="node"):
    """Adapter v1.1: server 30/30 + client 24/24 in a temporary layout (versions/v2.2.2 + versions/consumer-adapter-v1.1). Writes nothing into the repo."""
    python = python or sys.executable
    problems = []
    src_ad = os.path.join(root, "versions", "consumer-adapter-v1.1")
    src_eng = os.path.join(root, "versions", "v2.2.2")
    for p in (src_ad, src_eng):
        if not os.path.isdir(p):
            return [f"adapter11: falta carpeta {os.path.relpath(p, root)}"]
    tmp = tempfile.mkdtemp(prefix="core1-adapter11-")
    try:
        os.makedirs(os.path.join(tmp, "versions"))
        ad = os.path.join(tmp, "versions", "consumer-adapter-v1.1")
        shutil.copytree(src_ad, ad)
        shutil.copytree(src_eng, os.path.join(tmp, "versions", "v2.2.2"))
        dump = os.path.join(tmp, "dtos.json")
        code, out, err = run([python, "-I", os.path.join(ad, "tests", "run_server_scenarios.py.inert"), "--dump", dump])
        if code != 0:
            problems.append(f"adapter11/servidor: salió con código {code}")
        m = SUMMARY_SERVER11.search(out)
        if not m:
            problems.append("adapter11/servidor: falta línea resumen")
        elif (int(m.group(1)), int(m.group(2))) != (30, 30):
            problems.append(f"adapter11/servidor: resumen {m.group(1)}/{m.group(2)}, se esperaba 30/30")
        cdir = os.path.join(tmp, "client-run")
        os.makedirs(cdir)
        shutil.copy(os.path.join(ad, "client", "core1PriceAdapter.mjs.inert"), os.path.join(cdir, "core1PriceAdapter.mjs"))
        shutil.copy(os.path.join(ad, "tests", "run_client_tests.mjs.inert"), os.path.join(cdir, "run_client_tests.mjs"))
        if not (os.path.isfile(dump) and os.path.isfile(os.path.join(tmp, "dtos-internal.json"))):
            problems.append("adapter11: el servidor no generó los DTO/vistas para el cliente")
        else:
            code, out, err = run([node, os.path.join(cdir, "run_client_tests.mjs"), dump, os.path.join(tmp, "dtos-internal.json")])
            if code != 0:
                problems.append(f"adapter11/cliente: salió con código {code}")
            m = SUMMARY_CLIENT11.search(out)
            if not m:
                problems.append("adapter11/cliente: falta línea resumen")
            elif (int(m.group(1)), int(m.group(2))) != (24, 24):
                problems.append(f"adapter11/cliente: resumen {m.group(1)}/{m.group(2)}, se esperaba 24/24")
        if not problems:
            print("OK  adapter v1.1: servidor 30/30 y cliente 24/24 (simulados) en layout temporal")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return problems


def check_adapter111(root, python=None, node="node"):
    """Adapter v1.1.1: server 43/43 + client 27/27 in a temporary layout (versions/v2.2.3 + versions/consumer-adapter-v1.1.1). Writes nothing into the repo."""
    python = python or sys.executable
    problems = []
    src_ad = os.path.join(root, "versions", "consumer-adapter-v1.1.1")
    src_eng = os.path.join(root, "versions", "v2.2.3")
    for p in (src_ad, src_eng):
        if not os.path.isdir(p):
            return [f"adapter111: falta carpeta {os.path.relpath(p, root)}"]
    tmp = tempfile.mkdtemp(prefix="core1-adapter111-")
    try:
        os.makedirs(os.path.join(tmp, "versions"))
        ad = os.path.join(tmp, "versions", "consumer-adapter-v1.1.1")
        shutil.copytree(src_ad, ad)
        shutil.copytree(src_eng, os.path.join(tmp, "versions", "v2.2.3"))
        dump = os.path.join(tmp, "dtos.json")
        code, out, err = run([python, "-I", os.path.join(ad, "tests", "run_server_scenarios.py.inert"), "--dump", dump])
        if code != 0:
            problems.append(f"adapter111/servidor: salió con código {code}")
        m = SUMMARY_SERVER111.search(out)
        if not m:
            problems.append("adapter111/servidor: falta línea resumen")
        elif (int(m.group(1)), int(m.group(2))) != (43, 43):
            problems.append(f"adapter111/servidor: resumen {m.group(1)}/{m.group(2)}, se esperaba 43/43")
        cdir = os.path.join(tmp, "client-run")
        os.makedirs(cdir)
        shutil.copy(os.path.join(ad, "client", "core1PriceAdapter.mjs.inert"), os.path.join(cdir, "core1PriceAdapter.mjs"))
        shutil.copy(os.path.join(ad, "tests", "run_client_tests.mjs.inert"), os.path.join(cdir, "run_client_tests.mjs"))
        if not (os.path.isfile(dump) and os.path.isfile(os.path.join(tmp, "dtos-internal.json"))):
            problems.append("adapter111: el servidor no generó los DTO/vistas para el cliente")
        else:
            code, out, err = run([node, os.path.join(cdir, "run_client_tests.mjs"), dump, os.path.join(tmp, "dtos-internal.json")])
            if code != 0:
                problems.append(f"adapter111/cliente: salió con código {code}")
            m = SUMMARY_CLIENT111.search(out)
            if not m:
                problems.append("adapter111/cliente: falta línea resumen")
            elif (int(m.group(1)), int(m.group(2))) != (27, 27):
                problems.append(f"adapter111/cliente: resumen {m.group(1)}/{m.group(2)}, se esperaba 27/27")
        if not problems:
            print("OK  adapter v1.1.1: servidor 43/43 y cliente 27/27 (simulados) en layout temporal")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return problems


def main(argv):
    root = DEFAULT_ROOT
    only = None
    if "--root" in argv:
        root = os.path.abspath(argv[argv.index("--root") + 1])
    if "--only" in argv:
        only = argv[argv.index("--only") + 1]
    problems = []
    if only in (None, "models"):
        problems += check_models(root)
    if only in (None, "adapter"):
        problems += check_adapter(root)
    if only in (None, "adapter11"):
        problems += check_adapter11(root)
    if only in (None, "adapter111"):
        problems += check_adapter111(root)
    if problems:
        print("FALLA (código 1):")
        for p in problems:
            print(" -", p)
        return 1
    print("TODO OK (modelo/simulación offline; no prueba SQL, Admin, portal ni producción)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
