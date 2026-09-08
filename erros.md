# Log de Erros e Soluções

Este arquivo documenta erros arquiteturais, de sintaxe ou correções do usuário, para não repeti-los.

---

## 2026-09-04 — `@astrojs/sitemap` incompatível com Astro 4.16 (build quebrado)

**Erro:** `npm install` com `"@astrojs/sitemap": "^3.2.1"` resolveu para `3.7.4` (mesma major, mas
essa versão já assume a API interna de rotas do Astro 5). O build quebrava no hook
`astro:build:done` com `Cannot read properties of undefined (reading 'reduce')`, porque o
integration lê `_routes` de um formato de hook que não existe no Astro 4.16.x.

**Solução adotada:** fixar a versão exata (sem `^`) compatível com Astro 4:
```json
"@astrojs/sitemap": "3.2.1"
```
**Regra para o futuro:** ao usar `output: 'static'` com Astro 4.x, sempre fixar a versão exata
de `@astrojs/sitemap` testada com essa major do Astro, em vez de usar `^`. Se subir a major do
Astro no projeto, revalidar/atualizar essa integração junto.

---

## 2026-09-04 — `astro check` quebrando por causa da pasta `Dashboard/` (referência)

**Erro:** o usuário colou uma cópia da pasta `Dashboard/` do app real (React/Vite) na raiz deste
repo, como referência visual para a prévia da landing. Como o `tsconfig.json` usa
`"include": ["**/*"]`, o `astro check` passou a tentar type-checar esses `.tsx`, que importam
módulos internos do app (`../../../../context/AuthContext`, `data/services/...`, etc.) que não
existem neste repo — gerando 203 erros falsos e mascarando erros reais do site.

**Solução adotada:** adicionar `"Dashboard"` ao `exclude` do `tsconfig.json`. A pasta continua no
repo como referência, mas fica fora do type-check e do build (Astro só empacota o que está em
`src/`, então ela nunca foi incluída no bundle).

**Regra para o futuro:** qualquer pasta de referência/rascunho copiada para dentro do repo (fora
de `src/`) deve ser adicionada ao `exclude` do `tsconfig.json` assim que for criada, antes de
rodar `astro check`/`build`. Considerar também avisar o usuário para não deixar código-fonte do
app principal (proprietário) versionado dentro do repo público da landing por muito tempo.
