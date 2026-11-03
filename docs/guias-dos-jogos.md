# Guias individuais do catálogo

Cada jogo do catálogo abre `/jogo.html?id=<id>`. O ID é o mesmo dos três ficheiros de catálogo. As 47 fichas antigas continuam acessíveis e mostram o mesmo guia. Os artigos editoriais permanecem ligados na secção de dicas.

O leitor pode procurar outro jogo em `guias.html` ou no próprio guia. Títulos iguais em Mobile e PC aparecem como escolhas distintas. Um ID inexistente, um erro de rede ou uma fonte sem dados têm estados próprios com recuperação.

## Fontes e limites

- Steam: `appdetails`, com o ID exacto da ligação de loja, idioma português e região MZ. Não se reutilizam resultados de pesquisa nem capas como capturas de jogabilidade.
- Android: dados estruturados e capturas com o atributo de captura na ficha exacta do Google Play, consultada com `hl=pt&gl=MZ`.
- iOS: consulta oficial da Apple para o ID exacto na região MZ.
- Minecraft, Fortnite, Roblox, League of Legends e VALORANT: dados e materiais publicados pelos titulares. As fontes originais de cada imagem ficam em `scripts/publisher-guides.json`. Os ficheiros locais são versões WebP reduzidas, sem criar novas cenas. As capturas de League of Legends provêm dos vídeos oficiais, com o segundo da captura registado. As imagens de Roblox incluem material promocional e a interface de computador; isso é explicado na galeria. A galeria de Fortnite distingue os diferentes modos.
- Rocket League: a ficha oficial Steam 252950 continua a disponibilizar dados e capturas; o botão de acesso mantém o site actual do titular.

A ficha indica a data da consulta. Preços numéricos voláteis e medições de desempenho não são inventados. Campos ausentes ficam assinalados. Uma fonte que indica lançamento futuro apresenta passos de preparação. As orientações iniciais são editoriais e os guias práticos aprofundados existentes têm ligações próprias.

## Actualizar os dados

Executar `python scripts/refresh-guides.py`. A cache ignorada `.guide-cache/` torna a recolha retomável. Usar `--retry-unavailable` apenas para tentar fontes em falta; o programa respeita uma pausa de dez minutos depois de um HTTP 429 e limita a frequência de pedidos. Não mudar a rede ou o destino para contornar um limite do fornecedor. `--build-only` recompila os ficheiros a partir de uma cache completa sem novos pedidos.

O resultado tem um índice leve de pesquisa e 32 ficheiros de dados. Uma visita a um guia descarrega apenas o ficheiro que contém esse jogo. O manifesto regista a cobertura e eventuais fontes indisponíveis. Os requisitos técnicos são apresentados em texto, sem injectar HTML da loja.

O máximo da galeria é quatro imagens diferentes por jogo; quando existem menos capturas confirmadas, a página apresenta a quantidade real. As miniaturas são carregadas de forma diferida; as imagens grandes só são pedidas ao ampliar. A opção de poupar dados é partilhada com o catálogo e impede imagens no guia até ser desactivada pelo leitor.

## Verificação

`node scripts/check-site.mjs` verifica IDs, plataformas, fontes, ficheiros de dados, índice, imagens distintas e ligações locais. O workflow de QA executa os testes existentes e `guides.spec.cjs` em Desktop Chrome e Pixel 7, incluindo navegação, pesquisa, galeria, teclado, foco, poupança de dados, falhas, lançamentos futuros e larguras de 320 a 1440 px. As imagens nos testes funcionais são substituídas por um recurso controlado; a verificação visual usa as imagens reais.
