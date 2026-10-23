# Acto de transferencia de custodia — PLANTILLA (NO FIRMADA, NO VIGENTE)
**Preparada por:** ATLAS-TECH (AP-03), 2026-10-23; corregida según OBS-207. **Estado: CUSTODIA PROPUESTA** hasta acto explícito del Director y ACK del Curador. No declara a `atlas-hotels-v1` custodio efectivo, no adopta motores, no resuelve A/B §253 ni F-SEC-01, no cierra ni fusiona PR19, no activa aviso FROZEN en Office, y no es un acto de sellado global.

## 1. Tres conjuntos distintos (no mezclar)
| Conjunto | Origen | Destino | Commit origen (completo) | Commit destino (completo) | Observación |
|---|---|---|---|---|---|
| A. Kernel v1 nativo | `atlas-hotels-v1` `main` (no proviene de Office) | permanece | `21dfd63a9edbdf76962cb4170f3177de2c6176df` | mismo | 10 rutas en `KERNEL-V1-RECOVERY-MANIFEST.md`. No es copia. |
| B. 56 copias de mecanismos | `atlas-curator-office`, rama `atlas-tech/core1-price-changeset-v2` | `atlas-hotels-v1/core1-price/versions/` (v1…v2.2, consumer-adapter-v1) | `74c72621f6b56d4e52c108b771ffaf0f3dfcec27` | `3321211a5824c7894e4487a77e05c7bba404e546` (introducción); estado actual: HEAD al firmar | Inventario: `INVENTORY-CORE1-COPIES.md` |
| C. Creaciones posteriores del vault (sin origen en Office) | creadas en el vault por ATLAS-TECH | `core1-price/` | — | `6dc554723726a69c2c3c72eb02ca67f1e2ca5feb` (v2.2.2, runners, reglas, custodia) y commits posteriores | `versions/v2.2.2`, `runners/`, `rules/`, `custody/`, `KERNEL-NEW-VERSION-DESIGN.md`, `versions/consumer-adapter-v1.1` |
HEAD del vault al firmar: ______________________________ (completar con hash completo)

## 2. Qué NO se transfiere
- Decisiones del DG, dictámenes, evidencias y addendums: permanecen en `atlas-curator-office` (gobierno y evidencia inmutable).
- **Leyes COS:** el canon vive en `atlas-cos-v1`. Office conserva referencias; no migra ni transfiere leyes. El texto COS que aparezca en el vault no altera COS-v3.4.
- Datos, precios y reglas de negocio: Hotel Maestro / base de datos; la ubicación física (A/B) sigue abierta.

## 3. Roles propuestos (no vigentes hasta el acto)
- Custodio técnico único propuesto: `atlas-hotels-v1`.
- Mantenedor técnico propuesto: ATLAS-TECH (AP-03), sujeto a la autoridad existente; no crea puesto ni agente.
- Gobierno y evidencia: Office / Curador. Decisión: Director.

## 4. Condiciones previas
- [ ] Decisión explícita del Director sobre custodio único.
- [ ] Revisión del Curador del commit resultante (OBS-207) y ACK.
- [ ] `npm test` y `npm run test:core1:all` pasan en el commit firmado.
- [ ] Resolución de edición única de ramas (cuál copia acepta cambios) sin borrar ni fusionar por inferencia; PR19 sigue abierto sin merge hasta decisión.
- [ ] Texto del aviso en Office, solo tras el acto: "Evidencia histórica; custodia efectiva en [commit] según [acto]". Mientras tanto: "custodia propuesta". No llamar "vigentes" a versiones candidatas.

## 5. Datos del acto (vacíos; no se inventan)
Custodio designado: ________ · Fecha efectiva: ________ · Firma del Director: ________ · ACK del Curador: ________ · Acto/DIR de referencia: ________

## 6. Límites
Transferir custodia no adopta v2.2.2 ni ningún motor, no despliega, no crea tag del kernel y no autoriza SQL, Admin ni portal.
