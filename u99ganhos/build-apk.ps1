# Script para gerar o APK do aplicativo Expo

Write-Host "Iniciando o processo de build do APK..." -ForegroundColor Green

# Verifica se está logado na conta Expo
Write-Host "Verificando login na conta Expo..." -ForegroundColor Yellow
npx eas-cli whoami

if ($LASTEXITCODE -ne 0) {
    Write-Host "Você precisa fazer login na sua conta Expo." -ForegroundColor Red
    Write-Host "Execute: npx eas-cli login" -ForegroundColor Cyan
    exit 1
}

# Atualiza as dependências
Write-Host "Atualizando dependências..." -ForegroundColor Yellow
npm install --legacy-peer-deps

# Executa o build para Android como APK
Write-Host "Iniciando o build do APK para Android..." -ForegroundColor Yellow
npx eas-cli build --profile preview --platform android --no-wait

Write-Host "O build foi iniciado. Verifique o status no painel web do Expo:" -ForegroundColor Green
Write-Host "https://expo.dev/accounts/lzin9889/projects/u99ganhos-app/builds" -ForegroundColor Cyan

Write-Host "Quando o build estiver completo, o link para download do APK será exibido." -ForegroundColor Green