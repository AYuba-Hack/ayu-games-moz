# AYU Games MOZ — checklist de publicação (30/10/2026)

## Conteúdo

20 jogos Mobile, 20 jogos PC e 7 aventuras extra; GTA V e Fortnite constam dos 20 PC. Não são posições de um ranking nacional validado.

47 fichas de referência não-indexáveis até terem análise mais aprofundada, 9 guias de destaque e 12 guias existentes revistos.

## SEO

Sitemap: https://ayu-games-moz.pages.dev/sitemap.xml (33 URLs). Rever no Google Search Console a leitura e indexação; sitemap válido não garante indexação.

Testar redireccionamento de .html para URLs sem extensão no Cloudflare Pages e confirmar a tag canonical. Rever conteúdo original e fontes antes de pedir aprovação ao AdSense.

## Web Analytics

Não foi activado Cloudflare Web Analytics, pois não temos acesso ao token ou à configuração proprietária do projecto. Activar no painel Cloudflare e rever privacidade antes.

## Publicidade e consentimento

Infolinks ID 3449077 carregado apenas após consentimento do visitante nas páginas editoriais. Confirmar junto da Infolinks se a integração condicional cumpre a revisão da conta.

Favoritos guardados no navegador; calculadora local. Rever direitos de imagem: algumas capas dependem de servidores de lojas externas e têm fallback.

## Testes

Acompanhar GitHub Actions com Playwright e verificar mobile, links, carregamento real, Core Web Vitals e pagamento da Infolinks em Moçambique.

## Expansão do catálogo — 2 de Novembro de 2026

- Catálogo pesquisável em `/catalogo` com dados publicados localmente em `assets/mobile-expanded.json` e `assets/pc-expanded.json`.
- Fontes para orientação: Google Play em Moçambique e tabelas oficiais da Steam; a lista é editorial e NÃO representa um ranking exacto dos 200 mais descarregados nem jogadores activos.
- A homepage apresenta apenas nove cartões de jogos; catálogo carregado em lotes de 24 para reduzir consumo.
- Jogos sem imagens verificadas têm uma imagem editorial com o nome, sem fingir ser uma capa oficial. Não importar centenas de imagens de terceiros sem verificar direitos e fiabilidade.
- A pesquisa global envia para `/catalogo?q=...`. Verificar o endereço final sem extensão após redireccionamento Cloudflare.
- Rever resultados de QA, indexação e Core Web Vitals após publicação.

## V4 — 2 de Novembro de 2026

O catálogo ampliado inclui centenas de títulos. As listas do Google Play em Moçambique e os gráficos da Steam serviram como referências; os restantes são uma selecção editorial, não posições de um ranking oficial. Consulta `assets/mobile-expanded.json` e `assets/pc-expanded.json`.

O portal mantém as fichas verificadas, com capa, e apresenta cartões editoriais com nome para títulos adicionais cuja imagem não foi verificada. Não fingimos imagens de jogos nem direitos de utilização. O catálogo apresenta 24 resultados por lote e a opção 'Poupar dados' omite imagens apenas nos cartões carregados pelo catálogo dinâmico.

O comparador mostra apenas campos conhecidos e envia o leitor à loja para confirmar preço, idioma e requisitos. Não calcula FPS nem garante compatibilidade de hardware sem dados oficiais.

A homepage ficou com nove cartões de jogos e pesquisa global, para reduzir deslocamento. Os novos caminhos `/catalogo` e `/comparar` foram adicionados ao sitemap; verificar links e indexação após deploy.
