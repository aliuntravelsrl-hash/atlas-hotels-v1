# Sonda mínima — vista interna del kernel v2.0.3 sin cierre por enumeración
ATLAS-TECH (AP-03), 2026-10-24. **Separada** del productor. No modifica el kernel ni ninguna carpeta congelada; `node probe.js` solo lee `kernel-v2.0.3/`.
Estado: **DECLARADO-AT**, ejecutado por Atlas-Tech (salida abajo); pendiente de contraste directo del Curator. Seguimiento de hardening del kernel = revisión separada con versión nueva y dictamen (no se hace en este tramo).

## Referencias de fuente (kernel-v2.0.3, commit del vault `a9125e2`)
- `contracts.js` `validateInternalView`: valida claves/tipos de la vista, no restringe `calculation_status` ni `provider_amount_status` a un conjunto cerrado.
- `index.js` línea ~24: la proyección `internal` copia `v.calculation_status` y `v.provider_amount_status` sin enumeración.

## Qué hace la sonda
Toma el paquete `base`, reemplaza ambos campos por `SYNTH_PROBE_VALUE`, re-sella `internal_view_digest` (como lo habría emitido el servidor; sin ello el kernel rechaza por huella) y evalúa con `actor: 'OPERATOR'`.

## Salida observada (Atlas-Tech)
```
validateInternalView_ok: true; kernel_B_verdict: LISTO
internal_calculation_status: "SYNTH_PROBE_VALUE"; internal_provider_amount_status: "SYNTH_PROBE_VALUE"; hypothesis_reproduced: true
```
## Contención vigente
El productor (`core1-producer-v1.1/`) no copia esos campos: usa catálogos cerrados propios con `UNRECOGNIZED`. El kernel y su consumidor directo no están endurecidos.
