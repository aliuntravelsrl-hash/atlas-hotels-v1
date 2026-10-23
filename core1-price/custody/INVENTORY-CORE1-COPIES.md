# Inventario de las 56 copias de mecanismos Core 1 desde Office — CANDIDATO
**Origen:** `atlas-curator-office`, rama `atlas-tech/core1-price-changeset-v2`, commit `74c72621f6b56d4e52c108b771ffaf0f3dfcec27` · **Destino:** `atlas-hotels-v1/core1-price/versions/`, introducidas en `3321211a5824c7894e4487a77e05c7bba404e546` · **Preparado:** ATLAS-TECH (AP-03), 2026-10-23.
Solo las copias preexistentes. `versions/v2.2.2`, los runners y `consumer-adapter-v1.1` son **creaciones posteriores del vault**, fuera de este inventario (ver plantilla de custodia, conjunto C). El kernel v1 es nativo del vault (conjunto A).
**Estado de todas:** adoptado=no · desplegado=no · probado-offline=sí (modelo/simulación) · SQL ejecutado=nunca. No transfiere custodia.
Total: 56

| # | Ruta | git blob | SHA256 | adoptado | desplegado |
|---|---|---|---|---|---|
| 1 | `versions/consumer-adapter-v1/CORE1-PRICE-PUBLIC-DTO-v1.schema.json.inert` | `b3edf8e9f4a11cbcf10beb038bce8850df144c08` | `2d7dfd5434785a936bc127d98a208da5c9d1a5b44f0b5e4008a8c17433a97a26` | no | no |
| 2 | `versions/consumer-adapter-v1/LEGACY-RETIREMENT-LIST-v1.json.inert` | `81b5c61e6abbab0958d8d12eeb3232b7f76cb698` | `aee12d080fc3f0a8519127b1f3b3ff4ab438388aeb2ddf4515095bebd9feaa4b` | no | no |
| 3 | `versions/consumer-adapter-v1/README.md` | `56575f52f9d99c46a3ee278d396d1758889cb993` | `637af3dcc1dab81674bfa9cfb741198666de022c84a6a84383d0c964d5c7f7ba` | no | no |
| 4 | `versions/consumer-adapter-v1/client/core1PriceAdapter.mjs.inert` | `fba2451e0a088c8ae48b906124b2404a43167945` | `62cb04359d2cb7b130b9df685c1b9bc13c2cab3c331d53b4555eda052b311808` | no | no |
| 5 | `versions/consumer-adapter-v1/fixtures/generated-dtos.json` | `f14fdd37bc6d152c6c9d4ecd8536254ff486f139` | `a7d16a05fc539603677c2a425bd42db4b6ada685d01a0248aa7067e10eab72df` | no | no |
| 6 | `versions/consumer-adapter-v1/server/consumer_server_sim.py.inert` | `bc67d91feba116509e4e104414a9563e2b6eaf55` | `903cc05a3fd6476d0dc82c4dc631e26eecc13d5475e9311e1196e1d398c93d6c` | no | no |
| 7 | `versions/consumer-adapter-v1/tests/run_all.sh.inert` | `fcbb72d76b3e9b537d37a07992a2bc9797b43983` | `53e0ea2950d7840ea122b08e8abe543435f2a6b6cd9b3e965a19b787474469d2` | no | no |
| 8 | `versions/consumer-adapter-v1/tests/run_client_tests.mjs.inert` | `156ba832657b391df9ca3e3d3550f4523a556504` | `36b9c9328bf6c8a817ba8b5155a8b88de327c17dd0c34739cf8cbbd547d97da6` | no | no |
| 9 | `versions/consumer-adapter-v1/tests/run_server_scenarios.py.inert` | `b6f5b940a8d8a934f6cd56493576f7ccb8557622` | `8ece508745f156a48b91307ef6c4e0c1b7bf8181f3ec3e11cc58536ef5b9beb5` | no | no |
| 10 | `versions/v1/01-schema-core1-base-rates.sql.inert` | `11a87f8ca9c8464162fa21d23e6f20ef2b76757f` | `3f0045692e0b536af044784c60550726a6f716f6bdad304a29daaf6986b39536` | no | no |
| 11 | `versions/v1/02-core1-price-pure-v1.sql.inert` | `d0904dc49bffc0fc90b0f16e456d5d7a2398e981` | `60660ff428da2c41242a45a31c29d0ce2cffd81fe76470b9145d74651b47396d` | no | no |
| 12 | `versions/v1/03-room-and-load-template.sql.inert` | `11728dfdf0e5bacbc1caa90a8bbc5c02884dc051` | `ded48297557fafc9388d3db522c7e2358f17325b852811cebbce0ef684966910` | no | no |
| 13 | `versions/v1/04-rollback.sql.inert` | `6f01202fa7bd6f8d03ac13f9611a3f12b4a98036` | `4817203c5f3821f7b4662ff2b4013488d30a8aa74c297b8febef40890a332096` | no | no |
| 14 | `versions/v1/CORE1-BASE-PRICE-REGRESSION-v1.1-ATLAS-TECH.json` | `8661db088161b90f257e16465586df057c56f36e` | `e2cae1beba3746dcf45a0ba849bb4a3549f65ab48e5eaeb6b2cf85d90cd223ca` | no | no |
| 15 | `versions/v1/README.md` | `5f2e3d8d453b5ef983a7be27b191626e5dfba8d0` | `afc54ffdadc7965ee33655216053e3d56748b928dec4bec7d0e697b685054300` | no | no |
| 16 | `versions/v1/core1_reference_model.py.inert` | `4b32a4f78f32659d5d6e113ea88b8f1ac6837799` | `8d60b22e36df8989d721d7e3c4e4dec93596ec0b52db7c2eedf4fd3c9313290a` | no | no |
| 17 | `versions/v2/01-schema-core1-base-rates-v2.sql.inert` | `b50efc62078c3090c2346be6b584596a0d9b5958` | `43d8c3ed5cd31f7afc0e84f11c237faf488f2267db67bb742c53a9bef4ca406d` | no | no |
| 18 | `versions/v2/02-core1-price-pure-v2.sql.inert` | `277accadcc14fe440a91d900c40efd21b16a46d6` | `24a070743bdbdbb75c5519732eba9a0dc294aa80bc379a162b0421efbe97c364` | no | no |
| 19 | `versions/v2/04-rollback-v2.sql.inert` | `3bb8d563cae609401b641476062ec7569dec2e6f` | `0ab08cae8f6e30df90ecf35b9ad41c127e54e76373cf96bc5ff4880befe8e3ee` | no | no |
| 20 | `versions/v2/06-isolated-test-plan.md` | `e04b6e1a5b81e620a98445bb4212aebb64f6ede7` | `d4bd3cfcc0a78c07f76761aaa6e70d0184e1c0a2886b78da2a88eafbad062cb6` | no | no |
| 21 | `versions/v2/07-consumption-and-supersession-plan.md` | `777aff4dea20afec32e59327db77f46fe6a77372` | `a74689b2031a1efe96cf96c452ada1b49befe7d6cee76627aae786398c460a11` | no | no |
| 22 | `versions/v2/CORE1-BASE-PRICE-REGRESSION-v2.0-ATLAS-TECH.json` | `b947654a9dcb7d9fc2991f714af4d15d0f8f26a5` | `61d104398c0a436ba5a3a3dc383c319ef59b3a36b28f32d2af22df38253f23dc` | no | no |
| 23 | `versions/v2/DIFF-model-v1-v2.txt` | `03f723c4ce07ffe81bb066c832c8c409eb460916` | `e812b86f1ef3d4b95d519c8dd3950bf248faefcf3059e18957fb8857b25ef29f` | no | no |
| 24 | `versions/v2/DIFF-schema-v1-v2.txt` | `458a4c6e979edfaab053031ab97478dd0e089f4e` | `00cb32c409236060b7df182a100a7fda6d88211bd8cfa157aaad348e2a24e393` | no | no |
| 25 | `versions/v2/README.md` | `34d9b38a778779081327565b14e42527e3926e45` | `102b58a068f49872ed88336f6d1b63f46c9a2b43b7d97e3d48edfa6f173a97f8` | no | no |
| 26 | `versions/v2/core1_reference_model_v2.py.inert` | `56c48a988cc369f57c5e8d956893d3dc9abc2912` | `97cf7c02c305f17104e2aafdee89e67b748a2def2c999b5fa70eb09a9d28e5a6` | no | no |
| 27 | `versions/v2.1/01-schema-core1-base-rates-v2_1.sql.inert` | `3e56adea0ca7e2b711dd47e84279dfa5583b8016` | `e5a49b3debb36dde696babfa5ae13400da6953ff0a8543c41d1ff98f61c680fd` | no | no |
| 28 | `versions/v2.1/02-core1-price-pure-v2_1.sql.inert` | `7801a6631ca479bb5e74ca8b5649c56c04163c16` | `348b0fdc01ced8b138ac74556beae15044817e0017105a2084c04ca053efa767` | no | no |
| 29 | `versions/v2.1/04-rollback-v2_1.sql.inert` | `4e39a0517186677e272d9e8a890a11425521bcd3` | `0873c0ca145594880ae608a585f9aaf8bab85232cd39ae01e5f92a4fb30e55d8` | no | no |
| 30 | `versions/v2.1/06-isolated-test-plan.md` | `0c242fddf0ded1d6b050c19c0710c9501af20487` | `38e5e1799897ab267b1c44992d29696bed71151b74d97272c582d9aa87338fca` | no | no |
| 31 | `versions/v2.1/07-consumption-and-supersession-plan.md` | `777aff4dea20afec32e59327db77f46fe6a77372` | `a74689b2031a1efe96cf96c452ada1b49befe7d6cee76627aae786398c460a11` | no | no |
| 32 | `versions/v2.1/CORE1-BASE-PRICE-REGRESSION-v2.1-ATLAS-TECH.json` | `2eac55886e17378dd544c538ded2a513c159ab47` | `751bdeb5b1ae822e7bc8a81537746dda00043e372e7c18a7bcee90b3aabad945` | no | no |
| 33 | `versions/v2.1/DIFF-model-v2-v2.1.txt` | `042e5b580ee8203144016d688133f887cecbbeae` | `9fd35d1946dd07133863b3751f7e8cc515f41d329bf54583276835f9727d1b25` | no | no |
| 34 | `versions/v2.1/DIFF-rollback-v2-v2.1.txt` | `044337cc0313c0560612f77c6dd6a83279fe3475` | `e2c61f9c1215808f86901ffe54015d0d197c5530d0e292f879e3de72334ff704` | no | no |
| 35 | `versions/v2.1/DIFF-schema-v2-v2.1.txt` | `f04d3413f2723cb62c4da4488b34828b7910c8bf` | `de5dcb76d8fe308c7eadb8e605114d87acb573477670beaed5dcf1f37a2176d8` | no | no |
| 36 | `versions/v2.1/DIFF-sql-v2-v2.1.txt` | `c4dda1d7946c7b79e64c5ebda3c077d351a20c72` | `34f3700fbd83c59441705711e29bda224b38a447771525bad5b6da03d912b209` | no | no |
| 37 | `versions/v2.1/README.md` | `fd34105e8c43aa2425338e5af761be4438dadd52` | `c3d10a6af9c057fdb4756660d6de83db9781aa706eb70430a31b88e18d758601` | no | no |
| 38 | `versions/v2.1/core1_reference_model_v2_1.py.inert` | `be3db116a5deaee8dfa2a1f5345bec86df111e62` | `bd36a2f40fef9ae568d15bbe8fcdbcdd8f67bd2ff0b8b2cf16f4b1111e09ad21` | no | no |
| 39 | `versions/v2.1/tests/ANTIGRAVITY-LOCAL-PG-MANIFEST-v2_1.json` | `f1eb7ecfbf644051e5bfc6ffe37ff14259cbfbd4` | `7f2c200cebf2136ba4e8db4951ee9e9c61ebf8f6426ae8c627f92217e9cc51f1` | no | no |
| 40 | `versions/v2.1/tests/build_v2_1_cases.py.inert` | `413de6b2114e96c21cccb40db6b19e1801bf70a4` | `c500775a46836a6f068e36d77111da60270daa2f574f51987e0353fb1e52ad73` | no | no |
| 41 | `versions/v2.1/tests/legacy-fixtures-v1.json` | `08087ead414f609c709e450bfed8fe47b55fa5e8` | `f681e8c15f7791d74cd0f4ffac55e2127245fa4494e6853530db00f7e8151b07` | no | no |
| 42 | `versions/v2.1/tests/run_disposable_db_v2_1.py.inert` | `6e0906c635aa7edd744a81794eb0bcd0cfc68ceb` | `08934a33f1c9b322cd9aca2cc501db8d1614ccab3228ade50eb0ba159edfd0c4` | no | no |
| 43 | `versions/v2.1/tests/schema_acl_probes_v2_1.py.inert` | `85413579215780b1e203b69ba3bfee7b87167267` | `c7350a8145a8a6035d4d0ec5664a615368b920e87882d8d2905c3bf23891b984` | no | no |
| 44 | `versions/v2.2/CORE1-BASE-PRICE-REGRESSION-v2.2-ATLAS-TECH.json` | `3bd3ab7c826bfada76ad83fd47e4faa32e383a0e` | `3dedeb978519887c992b4bf07902056379819c6417b12e1754ac2ddd559bb0ca` | no | no |
| 45 | `versions/v2.2/README.md` | `9715801d4b573a6f0e8ab150c951abcc6161d06d` | `4ee36da52d831e3609aed992119298025049d519059cd079392870aecfcfd81a` | no | no |
| 46 | `versions/v2.2/SHA256SUMS.txt` | `e29da1b90c70191e6f544db4d1adae59d1f02d43` | `69ada2a90809d5d7b2e83dcd90d7ad40231b57ae10269010aa808069b831fe34` | no | no |
| 47 | `versions/v2.2/core1_reference_model_v2_2.py.inert` | `6c17534644f8dc079197c6ba034d7973dbd1489f` | `20e157508ced12d0ccb2940d2d1e6ed0d569b1d7918d5101b5e4ce1836454feb` | no | no |
| 48 | `versions/v2.2.1/CORE1-BASE-PRICE-REGRESSION-v2.2.1-ATLAS-TECH.json` | `1430c3ebe19108fa162f3d0edd6de2131c6bbca8` | `d135f54e318c046829182ecd17932b65c5c6081dc775fb60614fa187a623290a` | no | no |
| 49 | `versions/v2.2.1/README.md` | `4edae369f34e112122d5fb16dcc09f78bac8857d` | `2a97d4cd06247051e28dac01af11679afac3cf31b8c34e199dc3494fc2207bd1` | no | no |
| 50 | `versions/v2.2.1/SHA256SUMS.txt` | `e234e53b9e74701a1daba2be2de198d41bec7f9c` | `98a26d6716ea66b534f876f80cc6e34beba4d03fd792c823279df067e71cd74b` | no | no |
| 51 | `versions/v2.2.1/core1_reference_model_v2_2_1.py.inert` | `72a58516bd218e44fb71eb0124e14b2759bd3dc8` | `9670739f0d84359d2e96cd3d9e25f7f2d227ceffd0da006a8940b7763c55ce28` | no | no |
| 52 | `versions/v2.2.1/tests/build_v2_2_1_cases.py.inert` | `8d7e71d0725ee80ea51cf6463ff7827a11e599c5` | `d530d67f96a4db59413bc31a8e6dc401bd3f1e487d812f757fcedcd3b5df42d3` | no | no |
| 53 | `versions/v2.2/tests/build_v2_2_cases.py.inert` | `cdd877e2087093199746663eac05eaa33b59d61f` | `1aa740ddb956f64e4fee4c5507b7b7d03deed1551112589943086969d9630681` | no | no |
| 54 | `versions/v2/tests/build_v2_cases.py.inert` | `b2df32c4e891210a765a6120f558dc0dab228c73` | `f4e8f93d818377dc073bb5afdf79a3258b628c89e29a6d4b3fc15efb55e35932` | no | no |
| 55 | `versions/v2/tests/legacy-fixtures-v1.json` | `08087ead414f609c709e450bfed8fe47b55fa5e8` | `f681e8c15f7791d74cd0f4ffac55e2127245fa4494e6853530db00f7e8151b07` | no | no |
| 56 | `versions/v2/tests/run_disposable_db.py.inert` | `0ef8ef736e0194438687db396abca726de19d2e8` | `ae4d9dd59203a0dcd9d97ad4d51e644bf0a61ea504b95323557529fc25540aaf` | no | no |

## Dependencias transitivas
- `consumer-adapter-v1` → `v2.1` (simulador importa el motor v2.1; el wrapper reconstruye ese layout en copia temporal).
- `v2.1` → `v2` (contrato legacy). `v2.2` y `v2.2.1` son autónomos.

## Qué NO se mueve
- Informes, dictámenes y addendums: permanecen en Office.
- Datos y precios: Hotel Maestro / BD.
- Leyes COS: canon en `atlas-cos-v1`; no se migran.
