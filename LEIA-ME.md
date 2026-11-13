# Como usar este kit no Claude Code

1. Crie uma pasta vazia (ou um repositório no GitHub) chamada `ground-apps` e coloque **todo o conteúdo deste kit** nela, mantendo a estrutura:

   ```
   ground-apps/
   ├── CLAUDE.md          ← o Claude Code lê sozinho em toda sessão
   ├── LEIA-ME.md
   └── docs/
       ├── PRD_Marco_Zero.md
       ├── PRD_Sketch.md
       ├── Integracao.md
       ├── Precificacao.md
       ├── FASES.md       ← os comandos de cada fase
       └── prototipos/    ← referência visual (HTML e PDF)
   ```

2. Abra o Claude Code nessa pasta.
3. Cole o comando da **Fase 0** que está em `docs/FASES.md`. Responda às perguntas que ele fizer.
4. No fim de cada fase, revise o staging e só então cole o comando da fase seguinte.
5. Leve as decisões que ele pedir (domínio, gateway, preços, freemium) para a conversa entre Luca e Igor e registre no Diário de Bordo.

**Contas que vão ser necessárias ao longo do caminho:**
- GitHub, Vercel e Supabase (região São Paulo)
- uma chave da API da Anthropic
- Resend
- uma conta de parceiro da Nuvemshop
- o gateway de pagamento escolhido
