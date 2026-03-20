---
title: Mode 1 custom background
---

# Mode 1 custom assets

## Objetivo

No modo casual (`mode 1`), o usuário pode configurar tudo em uma única área lateral:

- upload da foto do veículo
- seleção de fundo predefinido
- upload de fundo personalizado

## Regras atuais

- `custom background` é um arquivo de imagem enviado pelo usuário.
- o preview principal do `mode 1` foi reduzido para abrir espaço para esses controles sem perder legibilidade.
- quando existe `custom background`, ele passa a ser tratado como o cenário principal da geração.

## Comportamento esperado

- o usuário pode configurar o fundo antes mesmo de enviar a foto.
- o fundo ativo mostra `Fundo personalizado` quando houver arquivo customizado.
- remover o fundo customizado faz o fluxo voltar a usar o fundo predefinido selecionado.

## Payload de geração

A rota `/api/generate` aceita, além da imagem principal:

- `customBackgroundBase64`
- `customBackgroundMimeType`

## Observação

O suporte a logo foi descartado por enquanto e pode ser retomado depois em um fluxo separado.
