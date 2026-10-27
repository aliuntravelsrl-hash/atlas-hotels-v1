# hotel-document-decision-v1.1 — modelo sintético OFFLINE de decisión documental, revisión acotada DM-R1–DM-R5 (OBS-247)

**INERTE · NO DESPLEGADO · NO FUSIONADO.** Modelo de referencia y pruebas del diseño lógico documental de hoteles adoptado por el Director (contrato `v1.2` + corrigendum `C12`, herencia `v1.1` según el mapa §0 de v1.2; fuentes en el Office: `specs/CANDIDATE-HOTEL-DOCUMENT-DECISION-CONTRACT-v1.2-ATLAS-TECH-20261027.md`, `specs/CORRIGENDUM-…-C12-…`). Sin servidor, sin endpoints, sin dependencias (solo `crypto` de Node), sin datos reales. Los kernels, productores, `core1-price` y el adaptador del vault **no se tocan**.

## Manual de operación y mapeo de versiones (AGENTS.md)
| Elemento | Versión | Notas |
|---|---|---|
| Contrato modelado | v1.2 + C12 (v1.1 solo en lo que v1.2 hereda) | `v1`, `v1.1`, `v1.2` permanecen intactas en el Office |
| Modelo | `hotel-document-decision-v1.1` (revisión de `-v1`, instantánea `e49fa9b` PR #16 conservada íntegra) | un cambio de mecanismo ⇒ nueva carpeta/versión; ni `-v1` ni esta se editan una vez fusionadas |
| Proyección pública | `1.2` | MINOR superior solo con campos opcionales declarados (`makeValidator`) |
| Kernel/productor/adaptador/RA-1 | sin relación | RA‑1 (PR #15) es independiente; no se importa |

## Comandos reproducibles (Node ≥ 18; sin instalar nada)
```
npm run test:hotel-doc11:model    # 109 casos (95 heredados + Dm01–Dm14); salida ≠ 0 si falla alguno o el mapa es inconsistente
npm run test:hotel-doc11:faults   # 138 mutantes + control positivo; salida ≠ 0 si sobrevive alguno no declarado equivalente
npm run test:hotel-doc11:probes   # sondas EXACTAS del Curator (OBS-247): v1.1 las cierra; la instantánea v1 las reproduce
npm run test:hotel-doc11:all
```
Resultado de referencia: 109/109 casos · 138 mutantes = 135 muertos + 3 equivalentes declarados aparte (M55, M62, M63) + 0 supervivientes · 12/12 comprobaciones de sondas.

## Qué cambia respecto de `-v1` (DM-R1…DM-R5)
| Ítem | Antes (v1) | Ahora (v1.1) | Casos |
|---|---|---|---|
| DM-R1 | localizador vacío/`PENDIENTE` e instantes malformados permitían render | localizador real exigido solo a `PROVIDER_LOCATOR` (no a `CONTRACTUAL_BASIS`); reloj, precio (`amount`/`currency`/`expires_at`) y `verified_at` validados; entrada malformada o ausente no habilita ni lanza sin gobierno; códigos existentes | Dm01–Dm06 |
| DM-R2 | el validador aceptaba combinaciones inválidas | condiciones cruzadas: ALLOW exige caducidad y no tiene motivos; `NONE` exclusivo; DENY/UNKNOWN exigen motivos y solo `[NONE]`; evidencia por tipo; documento/entrega coherentes; sobres producidos por el modelo validados | Dm07–Dm08 |
| DM-R3 | replay de documento VOIDED/SUPERSEDED devolvía ALLOW | el replay consulta el estado del artefacto; anulado/sustituido ⇒ respuesta gobernada sin segundo render; fallido/incierto ⇒ sin acciones | Dm09–Dm10 |
| DM-R4 | deriva durante render/envío no invalidaba el resultado | reautorización en el límite de liberación (revisión, reserva, proveedor/política, alcance, caducidad); deriva ⇒ cierre seguro, evidencia del intento conservada, sin duplicar; **no** se afirma atomicidad real de BD | Dm11–Dm13 |
| DM-R5 | respuestas de entrega sin caducidad | normal/replay/incierta llevan `decision_expires_at` y revisión de la autorización vigente, sin renovar permisos | Dm14 |

## Capas: qué prueba y qué NO prueba
| Capa | Qué demuestra el modelo | Qué NO demuestra (UNK/backend) |
|---|---|---|
| Forma estricta (`model` §validador) | solicitud/respuesta cerradas, tipos, enums anidados, signos por significado, comando↔tipo | validador propio mínimo, **no** JSON Schema; no hay host que lo aplique |
| Alcance y no revelación | `DENIAL_UNSCOPED` idéntica ante reserva existente/inexistente, credencial inválida/ajena/ausente | longitud observable, **timing**, transporte: UNK |
| Puertas por documento | QUOTE, REQUEST_ACK, BOOKING_CONFIRMATION, VOUCHER, PAYMENT_RECEIPT, INVOICE; pago y proveedor independientes | ninguna autoridad real de precio/política/fiscal/numeración: son dobles |
| Evidencia del proveedor | verificación por autoridad (doble), vínculo a reserva/selección/revisión, estado contractual, sustituto interno vs. coincidencia de texto | autenticidad real del emisor y del verificador |
| Idempotencia | índice por principal/tenant+comando+reserva; nonce ⇒ una solicitud canónica incluida la revisión; conflicto; replay revalidado | retención cerrada (UNK); almacenamiento real |
| Efectos | `REQUEST_DOCUMENT` ⇒ cero movimientos/estados/inventario (datos congelados + dobles con detección de intentos) | que un backend real no escriba por otra vía |
| Render y entrega | estados propios; solo el acuse del canal acredita; incierto ⇒ sin segundo efecto; reconciliación explícita | canal real, acuses reales, renderizador real |
| Acceso invitado | clases `UNVERIFIED/GUEST_VERIFIED/ACCOUNT·OPERATOR`; credencial limitada a una reserva | emisión, prueba de propiedad y caducidad reales: **UNK**; el fixture solo certifica coherencia del modelo |

## Contenido
`model/hotel-doc-decision.js` (modelo + validador + consumidor) · `tests/world.js` (puertos simulados y datos sintéticos) · `tests/run_doc_model_tests.js` (casos) · `tests/CASE-MAP.json` (mapa de herencia/supersesión) · `tests/run_fault_injection_doc_model.js` · `tests/curator-probes.js` + `tests/run_curator_probes_regression.js` (sondas exactas OBS-247) · `tests/evidence/` (resultados de la corrida) · `MANIFEST.sha256`.
