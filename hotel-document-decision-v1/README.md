# hotel-document-decision-v1 — modelo sintético OFFLINE de decisión documental (OBS-246)

**INERTE · NO DESPLEGADO · NO FUSIONADO.** Modelo de referencia y pruebas del diseño lógico documental de hoteles adoptado por el Director (contrato `v1.2` + corrigendum `C12`, herencia `v1.1` según el mapa §0 de v1.2; fuentes en el Office: `specs/CANDIDATE-HOTEL-DOCUMENT-DECISION-CONTRACT-v1.2-ATLAS-TECH-20261027.md`, `specs/CORRIGENDUM-…-C12-…`). Sin servidor, sin endpoints, sin dependencias (solo `crypto` de Node), sin datos reales. Los kernels, productores, `core1-price` y el adaptador del vault **no se tocan**.

## Manual de operación y mapeo de versiones (AGENTS.md)
| Elemento | Versión | Notas |
|---|---|---|
| Contrato modelado | v1.2 + C12 (v1.1 solo en lo que v1.2 hereda) | `v1`, `v1.1`, `v1.2` permanecen intactas en el Office |
| Modelo | `hotel-document-decision-v1` (primera versión) | un cambio de mecanismo ⇒ nueva carpeta/versión; esta no se edita una vez fusionada |
| Proyección pública | `1.2` | MINOR superior solo con campos opcionales declarados (`makeValidator`) |
| Kernel/productor/adaptador/RA-1 | sin relación | RA‑1 (PR #15) es independiente; no se importa |

## Comandos reproducibles (Node ≥ 18; sin instalar nada)
```
npm run test:hotel-doc:model     # 95 casos del modelo (salida ≠ 0 si falla alguno o si el mapa de casos es inconsistente)
npm run test:hotel-doc:faults    # 89 mutantes + control positivo; salida ≠ 0 si sobrevive alguno no declarado equivalente
npm run test:hotel-doc:all
```

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
`model/hotel-doc-decision.js` (modelo + validador + consumidor) · `tests/world.js` (puertos simulados y datos sintéticos) · `tests/run_doc_model_tests.js` (casos) · `tests/CASE-MAP.json` (mapa de herencia/supersesión) · `tests/run_fault_injection_doc_model.js` · `tests/evidence/` (resultados de la corrida) · `MANIFEST.sha256`.
