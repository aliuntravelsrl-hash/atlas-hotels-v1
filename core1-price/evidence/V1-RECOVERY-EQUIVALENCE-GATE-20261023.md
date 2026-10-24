# Puerta sustitutiva de preservación — recuperación de kernel v1 (OBS-215 §2)
ATLAS-TECH (AP-03), 2026-10-23. El tag `hotel-integrity-kernel-v1.0.0` sigue **pendiente de publicación** (deuda visible; local `24cfeb0e…` → `21dfd63`; push de tags fallido, sin force ni otras credenciales). Esta puerta lo sustituye para iniciar la implementación.
* **Método (solo lectura):** `git archive 21dfd63a9edbdf76962cb4170f3177de2c6176df kernel tests spec scripts | tar -x -C <directorio temporal nuevo>`; el checkout activo no se tocó. Tipo del objeto `21dfd63…` = `commit`.
* **Contraste:** por cada una de las 10 rutas de `core1-price/custody/KERNEL-V1-RECOVERY-MANIFEST.md` se calculó SHA-256 del archivo recuperado y `git hash-object` (blob) y se compararon con el manifiesto.
* **Resultado:** 10/10 rutas OK (blob y SHA-256 idénticos), 10 archivos recuperados, 0 fallos, sin rutas extra.
* **Límites:** prueba que v1 es recuperable e íntegra desde el commit completo; **no** sustituye la publicación del tag remoto ni lo crea. Verificación continua: prueba `R01` de `kernel-v2/tests/run_kernel_v2_tests.js` compara el árbol de trabajo con el mismo manifiesto.
