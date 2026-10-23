# Evidencia — corrida del adaptador v1.1.1 con jsonschema 4.26.0 (OBS-209 punto 3)
ATLAS-TECH (AP-03), 2026-10-23. Offline, sin red ni instalaciones. Corrida **repetida** hoy sobre el commit `ded02ded9065c8b6a9cf0cca9d8f60ee5c1cca70` (la salida original no se había conservado como archivo).
* Entorno: Python 3.13.16; jsonschema 4.26.0 (ya presente en el entorno de ATLAS-TECH).
* Comando (layout temporal con `versions/v2.2.3` + `versions/consumer-adapter-v1.1.1`): `python3 -I tests/run_server_scenarios.py.inert --dump <tmp>/d.json` y `node run_client_tests.mjs <tmp>/d.json <tmp>/d-internal.json`. Ambos código de salida 0.
* Salida relevante:
```
SCHEMA VALIDATOR: jsonschema 4.26.0
S40_R5_every_real_public_dto_validates_against_the_closed_schema PASS
S41_R5_nested_mutations_of_a_priced_dto_are_rejected PASS
S42_R5_no_price_branch_mutations_are_rejected PASS
S43_R5_schema_audit_every_object_is_closed_with_required_and_every_string_is_constrained PASS
SERVER SCENARIOS v1.1.1 (simulated): 43/43 PASS; failing=[]
CLIENT TESTS v1.1.1 (simulated DTOs): 27/27 PASS; failing=[]
```
* Alcance: S41 (mutaciones anidadas del DTO con precio), S42 (rama sin precio) y S43 (auditoría de cierre del esquema) se ejecutaron con la biblioteca. El Curator reprodujo el **respaldo declarado** (builtin-subset), no esta biblioteca; ambos validadores quedan cubiertos y la salida declara cuál corrió.
