# Script para mover o projeto para C: e fazer o build

# 1. Copiar arquivos (exceto node_modules)
Write-Host "Copiando arquivos para C:\u99ganhos..."
robocopy D:\u99ganhos C:\u99ganhos /E /XD node_modules .expo .git android ios

# 2. Navegar para a nova pasta
Set-Location C:\u99ganhos

# 3. Instalar dependências
Write-Host "Instalando dependências..."
npm install

# 4. Fazer o build
Write-Host "Iniciando build do APK..."
npx eas build -p android --profile preview

Write-Host "Pronto! Siga as instruções na tela."
