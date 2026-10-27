# hotel-document-decision-v1.2 — modelo sintético OFFLINE de decisión documental, residuales OBS-248 (DM-R4-A, DM-R4-B, DM-R5-A, DM-E1)

**INERTE · NO DESPLEGADO · NO FUSIONADO.** Modelo de referencia y pruebas del diseño lógico documental de hoteles adoptado por el Director (contrato `v1.2` + corrigendum `C12`, herencia `v1.1` según el mapa §0 de v1.2; fuentes en el Office: `specs/CANDIDATE-HOTEL-DOCUMENT-DECISION-CONTRACT-v1.2-ATLAS-TECH-20261027.md`, `specs/CORRIGENDUM-…-C12-…`). Sin servidor, sin endpoints, sin dependencias (solo `crypto` de Node), sin datos reales. Los kernels, productores, `core1-price` y el adaptador del vault **no se tocan**.

## Manual de operación y mapeo de versiones (AGENTS.md)
| Elemento | Versión | Notas |
|---|---|---|
| Contrato modelado | v1.2 + C12 (v1.1 solo en lo que v1.2 hereda) | `v1`, `v1.1`, `v1.2` permanecen intactas en el Office |
| Modelo | `hotel-document-decision-v1.2` (revisión de `-v1.1` = PR #17 `c2717e1`; `-v1` = PR #16 `e49fa9b`; ambas intactas) | un cambio de mecanismo ⇒ nueva carpeta/versión. «v1.2» es la versión del MODELO, no del contrato (contrato adoptado: v1.2 + C12, sin cambios) |
| Proyección pública | `1.2` | MINOR superior solo con campos opcionales declarados (`makeValidator`) |
| Kernel/productor/adaptador/RA-1 | sin relación | RA‑1 (PR #15) es independiente; no se importa |

## Comandos reproducibles (Node ≥ 18; sin instalar nada)
```
npm run test:hotel-doc12:model    # 119 casos (109 heredados + Rs01–Rs10)
npm run test:hotel-doc12:faults   # 162 mutantes + control positivo; ≠ 0 si sobrevive alguno no declarado equivalente
npm run test:hotel-doc12:probes   # sondas EXACTAS del Curator (OBS-247, OBS-248, M63): v1.2 las cierra, v1.1 reproduce los residuales
npm run test:hotel-doc12:all
```
Resultado de referencia: 119/119 · 162 mutantes = 161 muertos + 1 equivalencia CONDICIONADA aparte (M55) + 0 supervivientes · 16 comprobaciones de sondas. Ya NO se declaran equivalentes M62 ni M63 (corrección del Curator); M61 y M64 pasan de redundantes a muertos con casos de precedencia.

## Qué cambia respecto de `-v1.1`
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
`model/hotel-doc-decision.js` (modelo + validador + consumidor) · `tests/world.js` (puertos simulados y datos sintéticos) · `tests/run_doc_model_tests.js` (casos) · `tests/CASE-MAP.json` (mapa de herencia/supersesión) · `tests/run_fault_injection_doc_model.js` · `tests/curator-probes.js`, `tests/curator-residual-probes.js`, `tests/curator-m63-probe.js` + `tests/run_curator_probes_regression.js` (sondas exactas OBS-247/248) · `tests/evidence/` (resultados de la corrida) · `MANIFEST.sha256`.
