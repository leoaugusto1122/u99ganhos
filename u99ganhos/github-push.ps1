# Script para fazer login no GitHub e push do código
# Execute este script em um NOVO terminal PowerShell

Write-Host "=== GitHub Push Script ===" -ForegroundColor Cyan

# 1. Fazer login no GitHub
Write-Host "`n1. Fazendo login no GitHub..." -ForegroundColor Yellow
gh auth login

# 2. Navegar para o projeto
Write-Host "`n2. Navegando para o projeto..." -ForegroundColor Yellow
Set-Location D:\u99ganhos

# 3. Fazer push
Write-Host "`n3. Fazendo push para o GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n=== Concluído! ===" -ForegroundColor Green
Write-Host "Verifique em: https://github.com/leoaugusto1122/u99ganhos" -ForegroundColor Cyan
