# hotel-document-decision-v1.4 — modelo sintético OFFLINE de decisión documental, ID-F1 (OBS-250)

**INERTE · NO DESPLEGADO · NO FUSIONADO.** Modelo de referencia y pruebas del diseño lógico documental de hoteles adoptado por el Director (contrato `v1.2` + corrigendum `C12`, herencia `v1.1` según el mapa §0 de v1.2; fuentes en el Office: `specs/CANDIDATE-HOTEL-DOCUMENT-DECISION-CONTRACT-v1.2-ATLAS-TECH-20261027.md`, `specs/CORRIGENDUM-…-C12-…`). Sin servidor, sin endpoints, sin dependencias (solo `crypto` de Node), sin datos reales. Los kernels, productores, `core1-price` y el adaptador del vault **no se tocan**.

## Manual de operación y mapeo de versiones (AGENTS.md)
| Elemento | Versión | Notas |
|---|---|---|
| Contrato modelado | v1.2 + C12 (v1.1 solo en lo que v1.2 hereda) | `v1`, `v1.1`, `v1.2` permanecen intactas en el Office |
| Modelo | `hotel-document-decision-v1.4` (revisión de `-v1.3` = PR #19 `fec14af`; `-v1.2` = PR #18 `96a87a6`; `-v1.1` = PR #17 `c2717e1`; `-v1` = PR #16 `e49fa9b`; todas intactas; #20 ⊃ #19 ⊃ #18 ⊃ #17 ⊃ #16) | un cambio de mecanismo ⇒ nueva carpeta/versión. «v1.2» es la versión del MODELO, no del contrato (contrato adoptado: v1.2 + C12, sin cambios) |
| Proyección pública | `1.2` | MINOR superior solo con campos opcionales declarados (`makeValidator`) |
| Kernel/productor/adaptador/RA-1 | sin relación | RA‑1 (PR #15) es independiente; no se importa |

## Comandos reproducibles (Node ≥ 18; sin instalar nada)
```
npm run test:hotel-doc14:model    # 132 casos (126 heredados + Id01–Id05b)
npm run test:hotel-doc14:faults   # 178 mutantes + control positivo; ≠ 0 si sobrevive alguno no declarado equivalente
npm run test:hotel-doc14:probes   # sondas EXACTAS del Curator (OBS-247…250, M63): v1.4 las cierra; v1.1/v1.2/v1.3 reproducen los residuales
npm run test:hotel-doc14:all
```
Resultado de referencia: 132/132 · 178 mutantes = 175 muertos + 3 equivalencias declaradas APARTE (M55, P05, P06; siguen condicionadas, no cuentan como detectadas) + 0 supervivientes · 29 comprobaciones de sondas.

## Qué cambia respecto de `-v1.3` (OBS-250, ID-F1)
| Ítem | Antes (v1.3) | Ahora (v1.4) | Casos |
|---|---|---|---|
| ID-F1 | si el generador de ids caía tras el envío, `denialUnscoped` lanzaba antes de enlazar nonce→entrega; con el acceso restaurado el mismo comando enviaba otra vez | (1) el vínculo nonce→operación→entrega se escribe ANTES del efecto; (2) la interpretación del resultado del canal forma parte del efecto: cualquier fallo ⇒ entrega INCIERTA, nunca sin vínculo; (3) el estado terminal del vínculo sigue al de la entrega aunque la salida falle; (4) **política de correlación alternativa DECLARADA**: si el generador falla o devuelve un id inválido, la denegación sigue siendo gobernada con un id opaco local `LOCAL-<n>` (contador interno, sin datos de solicitud/reserva/actor/documento; el contrato solo exige un id opaco). Un error no gobernado de la propia petición después del efecto se vuelve a lanzar (no se convierte en éxito) pero el vínculo ya existe | Id01–Id05b |

## Historial: de `-v1.2` a `-v1.3` (OBS-249)
| Ítem | Antes (v1.2) | Ahora (v1.3) | Casos |
|---|---|---|---|
| BND-1 | el renderizador recibía `d.amounts` por referencia y podía alterar el importe autorizado y la proyección | todo dato que entra por un puerto se copia en profundidad; el renderizador recibe una COPIA y, si altera su entrada (importes, tipo, reserva, revisión), el documento queda `RENDER_FAILED` sin artefacto liberado y el intento se conserva, sin re-render; la instantánea de decisión se congela | Bn01–Bn03 |
| BND-2 | tras perder el alcance durante el envío, el resultado exterior incluía `delivery` (ids, canal, estado, acuse) junto a una `DENIAL_UNSCOPED` | `handle` proyecta TODO el resultado exterior: sin alcance acreditado (incluidos reloj, identidad o reserva no verificables) el exterior es solo la denegación; el intento/acuse y la idempotencia siguen en el registro interno y se recuperan por replay solo con acceso actual, sin segundo envío. Con alcance conservado (p. ej. caducidad) el historial sigue mostrándose | Bn04–Bn06 |

## Historial: qué cambió de `-v1.1` a `-v1.2` (OBS-248)
| Ítem | Antes (v1.1) | Ahora (v1.2) | Casos |
|---|---|---|---|
| DM-R4-A | al liberar solo se comprobaba que la reevaluación diera ALLOW: un precio/evidencia/política válidos pero distintos liberaban el contenido anterior | el artefacto guarda una huella canónica de sus dependencias reales (selección, revisión, importes, evidencia —id/revisión/huella—, versión y huella de política); al liberar (render y envío), en replay, en entrega y en el barrido se compara; deriva ⇒ SUPERSEDED, artefacto e intento conservados, sin re-render. Código usado: `REVISION_CHANGED` (**sustituto declarado**; el catálogo no tiene «dependencia cambiada»: propuesta separada, ver informe) | Rs01–Rs03, Rs09 |
| DM-R4-B | el límite repetía identidad y propiedad, no el alcance de comando/tipo/destinatario | `resolveScope` (compartido por entrada y límite) incluye `guestScope` (comando, tipo, share_kind); además compara principal, tenant y clase; política ausente/malformada o que falla ⇒ UNKNOWN gobernado; pérdida ⇒ cierre seguro sin cancelación retroactiva del envío | Rs04, Rs05 |
| DM-R5-A | tras el envío se devolvía `ALLOW` con una caducidad ya vencida | la caducidad ORIGINAL se comprueba tras el envío (límite inclusivo) y en cada salida; `DENY DECISION_EXPIRED` con el acuse histórico (`delivery`) conservado y sin renovar plazo; un replay denegado ya no borra el registro de la entrega original | Rs06, Rs07, Rs10 |
| DM-E1 | M62/M63 declarados equivalentes | M63 no equivalente (cancelación+revisión ⇒ VOIDED); M62 deja de ser equivalente (hay una vía nueva a SUPERSEDED: deriva de dependencias); M55 condicionada y aparte | Rs08, Rs09 |

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
`model/hotel-doc-decision.js` (modelo + validador + consumidor) · `tests/world.js` (puertos simulados y datos sintéticos) · `tests/run_doc_model_tests.js` (casos) · `tests/CASE-MAP.json` (mapa de herencia/supersesión) · `tests/run_fault_injection_doc_model.js` · `tests/curator-probes.js`, `tests/curator-residual-probes.js`, `tests/curator-boundary-probes.js`, `tests/curator-ids-failure-probe.js`, `tests/curator-m63-probe.js` + `tests/run_curator_probes_regression.js` (sondas exactas OBS-247/248) · `tests/evidence/` (resultados de la corrida) · `MANIFEST.sha256`.
