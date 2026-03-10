---
trigger: always_on
---

# Informacao de produto

O Car Studio AI é a ferramenta ideal para revendedores, lojistas e vendedores de carros que desejam profissionalizar seus anúncios e aumentar o interesse dos compradores. Com poucos cliques, você transforma fotos simples tiradas no pátio da loja ou até mesmo com o celular em imagens com aparência de estúdio profissional, prontas para anunciar em marketplaces como OLX, Webmotors, Marketplace do Facebook e outros portais de venda. A maioria dos compradores decide se vai clicar em um anúncio em menos de 2 segundos. Fotos escuras, com fundo poluído ou aparência amadora fazem com que seu anúncio seja ignorado, mesmo que o carro seja excelente. O Car Studio resolve esse problema usando inteligência artificial para melhorar iluminação, aplicar fundos profissionais e destacar o veículo, mantendo todos os detalhes reais do carro. O processo é simples: envie as fotos do veículo, escolha um dos cenários automotivos disponíveis e, em poucos minutos, suas imagens ficam prontas para download em alta resolução. Assim, você pode padronizar todo o seu estoque e transmitir muito mais profissionalismo para seus clientes. Com o Car Studio AI você consegue economizar dinheiro com fotógrafos, agilizar a publicação dos anúncios e aumentar a atratividade do seu estoque. A ferramenta foi criada para quem quer vender mais carros com anúncios mais profissionais, sem precisar de conhecimento em edição de imagem. Se você quer destacar seus veículos nos portais de venda e passar mais confiança para os compradores, o Car Studio AI é a solução ideal para modernizar seus anúncios e transformar fotos comuns em imagens que realmente vendem.


a pasta /demo tem um MVP do projeto, uma versao basica de teste, mas com as funcionalidades basicas que queremos na versao de producao, que sera feita na pasta /carstudioAI

Projeto em next.js deploy no vercel

DB no supabase, mas iremos compartilhar uma DB usada em outros projetos, parecidos com esse

Sistema de pagamento no hotmart, mas outro projeto que usa a mesma DB cuida disso, aqui apenas iremos usar os creditos ja existentes na conta

Cada credito pode ser usado para gerar uma imagem, contas novas ganham 2 creditos de brinde

Se nao tem credito, nao pode gerar imagem, e mostre o usuario que ele nao tem creditos suficientes
UI/UX tem que ser amigavel e moderno, devemos sempre mostrar quantos creditos a pessoa tem no header

As integracoes com a DB ja existente serao passadas eventualmente para voce

Usaremos google e email auth do supabase, esses emails vao ser os mesmos usados no hotmart, e eles serao as contas que terao os creditos

Se alguma informacao ficou faltando voce pode preencher ela com oque eh melhor, ou perguntar apos terminar de fazer tudo que eh possivel

Documente suas decisoes, se precisar de alguma schema file, crie ela, nao deixe ela somente no chat, use .md files para documentar sistemas e decisoes, crie elas no diretorio /docs