# A01–A16: qué se ejecutó y qué NO es ejecutable sin fuente real
Todos los escenarios se ejecutaron contra el **mecanismo** con fuentes SINTÉTICAS inyectadas (suite `npm run test:physical-adapter`, 41 pruebas, incluidas R01–R10 de PA-R1/PA-R2 con reloj simulado, sin sleep ni red). Eso **no acredita** SQL, proveedor, autenticación ni seguridad reales y no equivale a E2E.
Fallos del mecanismo observados: ninguno en la versión entregada (las fallas de desarrollo se listan en el informe). **NO EJECUTABLE por fuente real ausente** (no sintético): ninguna de las pruebas puede declararse cumplida contra datos reales mientras falten estas fuentes:

| Escenario | Qué prueba el mecanismo (sintético) | Fuente real que sigue ausente (no se simula) |
|---|---|---|
| A01–A02 | referencia ajena / sinonimia sin código no acreditan precio | registro autorizado hotel_ref/plan/proveedor/producto (M01, M02, M05, M06) |
| A03–A05 | capacidad divergente, regla de otro hotel, edades sin precio no se completan | capacidad oficial y precedencia, perfil versionado, reglas de precio por edad (M16, M17, M19) |
| A06 | `created_at` no es recepción | evidencia de recepción por revisión (M13, M14) |
| A07–A10 | sin revisión inmutable ⇒ no listo; deriva bloquea el provisional | materialización inmutable y autoridad de revisiones (M08, M23) |
| A11–A12 | texto de depósito no se parsea; FX solo gobernada | política y FX gobernadas (M20–M22) |
| A13 | traceability y filas ajenas | términos acreditados por fila y proveedor (M02, M11, M15) |
| A14 | hash ≠ autenticación | autenticación/autorización real (fuera de alcance) |
| A15 | errores externos reducidos al catálogo | comportamiento real del cliente SQL (fuera de alcance) |
| A16 | paridad de contrato en el camino válido | datos reales de tarifa Viva (no se inventan) |
