# Matriz base → estado → importe → DTO (kernel v2.0.5-candidate)
Fuente: emisor congelado (`consumer_server_sim.py.inert` líneas 192–203) y propuesta Office 0c05ced. Clases del emisor actual; no exhaustiva de cualquier entrada.
| source_basis.status (bases) | provider_amount_status | calculation_status observado | DTO | provider_amount | source_subtotal | Casos del fixture |
|---|---|---|---|---|---|---|
| CLIENT_FINAL ([CLIENT_FINAL]) | NOT_ACCREDITED_CLIENT_FINAL | COMPLETE | PRICE_REFERENCE | null | presente, basis CLIENT_FINAL | base y 9 más |
| NET_PROVIDER ([NET_PROVIDER]) | ACCREDITED | SOURCE_SUBTOTAL_ONLY | CONSULT | objeto = subtotal (amount, currency) | presente, basis NET_PROVIDER | net_consult |
| MIXED (≥2) | NOT_ACCREDITED_MIXED | SOURCE_SUBTOTAL_ONLY | CONSULT | null | basis MIXED | enum_mixed_probe |
| UNKNOWN (1 distinta) | NOT_ACCREDITED_UNKNOWN | SOURCE_SUBTOTAL_ONLY | CONSULT | null | basis UNKNOWN | enum_basis_unknown |
| NOT_EVALUATED ([]) | NOT_ACCREDITED_NOT_EVALUATED | INCOMPLETE / INVALID | CONSULT / REQUEST_INVALID | null | null | enum_incomplete_*, enum_invalid_probe |
Verificado en el motor: `sources_used` solo se escribe junto a `source_subtotal` (SOURCE_SUBTOTAL_ONLY o COMPLETE); los estados de error no traen fuentes ⇒ NOT_EVALUATED. Sin contradicción entre las formas legítimas y R1–R4.
