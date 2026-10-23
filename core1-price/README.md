# CORE 1 — Precio de referencia hotelero (custodia de mecanismos)
**Repositorio custodio:** `atlas-hotels-v1` (State Vault de la vertical hotelera) · **Estado:** RAMA CANDIDATA, SIN FUSIONAR — ningún mecanismo está adoptado ni desplegado. La custodia aquí NO está transferida hasta que exista un acto firmado (ver `custody/`).
**Autoridad:** Director General Aldo Hilario / Curator Constitucional · **Preparación técnica:** ATLAS-TECH (AP-03). Las ventanas de trabajo se convocan por el Director (chat/DIR11), no por el Curador ni por este repositorio.
**Creado:** 2026-10-23 · **Origen de las copias:** `atlas-curator-office` rama `atlas-tech/core1-price-changeset-v2`, commit `74c7262` (PR #19 draft del Curador, sin merge).

## Qué es Core 1
Cotización **de consulta** (no pagable, manual/asíncrona) del precio de un hotel, calculada por un único motor y consumida por la web pública, el Admin (Hotel Maestro) y el Monitor de Integridad desde **la misma fuente**. Si el dato falta o es dudoso, la respuesta es "Consultar": el sistema no infiere precios.

## Qué contiene este directorio
| Ruta | Contenido |
|---|---|
| `rules/DIRECTOR-RULES-CORE1-20261023.md` | Reglas de negocio del Director con fecha y fuente (chat). Mandan sobre cualquier versión. |
| `VERSION-MAP.md` | Mapa de versiones del mecanismo y estado de cada una. |
| `versions/v1 … v2.2.2` | Todas las versiones del motor/changeset, **sin alterar** (hashes en `MANIFEST.sha256`). |
| `versions/consumer-adapter-v1` | Diseño inerte del adaptador de consumo (servidor simulado, DTO público, cliente). |
| `prompts/` | Prompt para el ejecutor (cambios en Admin / booking form). **Es un documento guardado, no un despacho operativo**; atribuye alcances a la conversación ATLAS-TECH. ATLAS-TECH no edita Admin directamente. |
| `rules/PROVENANCE-DIRECTOR-INSTRUCTIONS-20261023.md` | Texto literal de las instrucciones del Director, mapa de supersesiones y reservas. |
| `runners/` | Ejecutor offline con código de salida real y su prueba de inyección de fallos. |
| `custody/` | Inventario de copias, plantilla del acto de transferencia y manifiesto de recuperación del kernel v1. |
| `KERNEL-NEW-VERSION-DESIGN.md` | Diseño (no implementado) de una versión nueva del kernel. |
| `RECEIVED-AT-MAPPING-DESIGN.md` | Diseño del mapeo de `received_at` y evidencias mínimas antes de cualquier SQL (`rates.created_at` = UNK). |
| `versions/consumer-adapter-v1.1` | Adaptador inerte para contexto/motor v2.2.2 (30 + 24 pruebas simuladas). El v1 se conserva. |
| `KERNEL-ALIGNMENT-FINDINGS.md` | Hallazgo **separado**: desalineaciones entre el Mirror Kernel actual y las reglas del Director. No modifica el kernel. |
| `MANIFEST.sha256` | Hash de cada archivo copiado, para verificar que la custodia no se altera. |

## Candidata de referencia: v2.2.2 (no adoptada, no desplegada)
Calcula solo habitación, personas, ocupación, precio por persona y noche, y niños por edad. Sin valores por defecto; 0 no es precio; suplementos e impuestos viajan como notas; las condiciones con caducidad devuelven estado sin alterar el monto; rangos solapados los resuelve la tarifa vigente con el instante de ingesta (`received_at`) más reciente.

## Qué prueba y qué no
- Los vectores de cada versión son **sintéticos** y prueban coherencia modelo↔oráculo.
- **No** prueban SQL (nunca ejecutado), Admin, web ni adaptador. La ejecución aislada con PostgreSQL queda para Antigravity (no disponible hasta el 29-Oct) bajo convocatoria del Director por chat/DIR11 (el Curador publica prompts preparados; publicar no convoca).

## Comprobar
```bash
npm test                 # kernel existente (sin cambios en este aporte)
npm run test:core1:all   # modelos v2.2.2 (115), v2.2.1 (107) y v2.2 (97), adaptador simulado, + adaptador v1.1 (30 + 24) + 21 comprobaciones del runner (19 negativas, la reproducción del defecto original `python | tail -1` y 1 control positivo); falla con código != 0
sha256sum -c core1-price/MANIFEST.sha256
```

## Reglas de custodia
- Una versión publicada **no se edita**: un mecanismo modificado => versión nueva (carpeta nueva + entrada en `VERSION-MAP.md` y en `history/INTEGRITY-STATE-LOG.md`).
- Sin secretos, JWT, IDs de chat ni PII en este repositorio.
- Las tarifas reales no se guardan aquí: viven en Supabase (`hotels_master`, `rooms`, `rates`). Aquí solo hay lógica, contratos, pruebas sintéticas y reglas.
