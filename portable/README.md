# Saiku Lite Portable Launcher

Este diretório contém arquivos auxiliares para rodar o Saiku Lite diretamente de um pendrive, sem depender de uma instalação prévia de Python ou Node na máquina hospedeira. A idéia é montar o pendrive com todos os binários portáteis, assets já compilados e scripts de inicialização para macOS e Windows.

## Estrutura sugerida

```
pendrive/
├── saiku_lite/                # este repositório
│   ├── portable/
│   │   ├── launch.py
│   │   ├── README.md
│   │   ├── mac/
│   │   │   └── Python.framework/...   # Python portátil para macOS
│   │   ├── windows/
│   │   │   └── python/                # Python embutido p/ Windows
│   │   ├── node/                      # Node portátil (binário)
│   │   ├── run_mac.command
│   │   └── run_windows.bat
│   ├── src/...
│   └── unb-budget-dashboard/...
└── (opcional) atalhos .lnk /.app
```

### Dependências portáteis

- **Python**  
  - Windows: baixe o *Embeddable Package* (ex.: `python-3.12.7-embed-amd64.zip`), extraia em `portable/windows/python`.  
  - macOS: baixe o instalador oficial, copie `Python.framework` (ou utilize [`pyenv`](https://github.com/pyenv/pyenv) para gerar um build relocável) para `portable/mac/Python.framework`.
- **Node.js**  
  - Baixe a versão **LTS** correspondente ao seu ambiente e extraia para `portable/node/`. Ex.: no Windows, o arquivo `node.exe` ficará em `portable/node/node.exe`; no macOS/Linux, `portable/node/bin/node`.

### Preparação prévia (no seu computador)

1. **Build do dashboard React/Node**
   ```bash
   cd unb-budget-dashboard
   pnpm install
   pnpm run build
   ```
   O comando gera `unb-budget-dashboard/dist/index.js` e `unb-budget-dashboard/dist/public/`.

2. **Instalar dependências Python dentro do Python portátil**
   ```bash
   # Windows (no terminal do pendrive):
   portable\\windows\\python\\python.exe -m pip install --upgrade pip
   portable\\windows\\python\\python.exe -m pip install -r requirements.txt

   # macOS:
   portable/mac/Python.framework/Versions/Current/bin/python3 -m pip install --upgrade pip
   portable/mac/Python.framework/Versions/Current/bin/python3 -m pip install -r requirements.txt
   ```

3. Copie a árvore completa para o pendrive (ou sincronize via `rsync`).

## Como rodar

- **Windows**: abra o pendrive no Explorer e dê duplo clique em `Executar no Windows.vbs`. Esse script usa `pythonw.exe` embutido, carrega as bibliotecas pré-instaladas e inicia o servidor sem abrir Prompt de Comando (ideal para máquinas com políticas restritivas). O `.bat` dentro de `portable/windows` fica como fallback, caso necessário.
- **macOS**: dê duplo clique em `portable/run_mac.command`. Na primeira abertura o macOS pode solicitar permissão por ser um script baixado de internet; confirme e o serviço iniciará. Você pode transformar esse `.command` em um app com Automator (Aplicativo → “Executar Shell Script” → `portable/run_mac.command`).
  > Se o Finder indicar falta de permissões, execute `chmod +x portable/run_mac.command` uma vez.

O script `portable/launch.py`:

1. Ajusta variáveis de ambiente para que o Flask encontre os assets estáticos e use o backend Node local (`DASHBOARD_API_URL=http://127.0.0.1:3000`).
2. Inicia o bundle `unb-budget-dashboard/dist/index.js` com o Node portátil.
3. Abre o navegador padrão apontando para `http://127.0.0.1:5000`.
4. Sobe o Flask (`src.app`) com `use_reloader=False` para evitar múltiplas instâncias.
5. Ao encerrar (Ctrl+C ou fechar o terminal), derruba o processo Node auxiliar.

### Ajustes / configurações

- Para definir credenciais padrão diferentes, crie um arquivo `.env` na raiz do projeto e ajuste o launcher para carregá-lo (o script atual usa valores padrão adequados para demos).
- Se preferir usar um backend Node hospedado (ex.: Render), basta comentar ou remover o trecho correspondente no `launch.py` e ajustar `DASHBOARD_API_URL`.

## Atualizando o pendrive

Sempre que fizer alterações:

1. Recompile o dashboard (`pnpm run build`).
2. Rode novamente os `pip install` dentro dos ambientes portáteis se novas dependências forem adicionadas.
3. Sincronize os arquivos com o pendrive substituindo os conteúdos antigos.

## Solução rápida de problemas

- **Tela em branco no Dashboard**: confirme se `unb-budget-dashboard/dist/public` existe no pendrive e se o Node portátil está iniciando (ver logs do terminal).
- **Erro de módulo Python não encontrado**: revise se as bibliotecas foram instaladas no Python portátil (os comandos `pip` acima).
- **Portas ocupadas**: se porta 5000 (Flask) ou 3000 (Node) estiverem em uso, edite `portable/launch.py` para usar outras portas e ajuste `DASHBOARD_API_URL`.

Com essa estrutura você tem um ambiente transportável para demonstrações em máquinas que não possuem Python/Node instalados. O usuário final só precisa dar duplo clique no script certo para subir toda a pilha localmente.
