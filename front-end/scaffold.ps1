$ErrorActionPreference = "Stop"

cd e:\vs-code-projects\openplaylist-mono\front-end\src

# APP
mkdir -Force app/providers, app/styles | Out-Null
New-Item -ItemType File -Force app/providers/router.ts, app/providers/store.ts, app/providers/query.ts, app/providers/index.ts | Out-Null
Set-Content -Path app/styles/main.css -Value '@import "tailwindcss";'
New-Item -ItemType File -Force app/styles/index.ts | Out-Null

# PAGES
$pages = @("home", "dashboard", "login", "register", "settings", "history", "statistic", "policy", "player", "oauth-callback", "email-confirm")
foreach ($p in $pages) {
    mkdir -Force pages/$p/ui | Out-Null
    $pascalCase = (Get-Culture).TextInfo.ToTitleCase($p.Replace("-", " ")).Replace(" ", "")
    New-Item -ItemType File -Force "pages/$p/ui/${pascalCase}Page.vue", "pages/$p/index.ts" | Out-Null
}

# WIDGETS
$widgets = @("header", "footer", "menu-dropdown", "root-error")
foreach ($w in $widgets) {
    mkdir -Force widgets/$w/ui | Out-Null
    $pascalCase = (Get-Culture).TextInfo.ToTitleCase($w.Replace("-", " ")).Replace(" ", "")
    New-Item -ItemType File -Force "widgets/$w/ui/${pascalCase}.vue", "widgets/$w/index.ts" | Out-Null
}

# FEATURES
$features = @("auth", "dashboard", "landing", "playlist", "public-playlist", "settings", "user-settings")
foreach ($f in $features) {
    mkdir -Force features/$f/ui, features/$f/model | Out-Null
    New-Item -ItemType File -Force "features/$f/index.ts" | Out-Null
}

# ENTITIES
$entities = @("user", "playlist", "app-settings", "track")
foreach ($e in $entities) {
    mkdir -Force entities/$e/model, entities/$e/ui | Out-Null
    New-Item -ItemType File -Force "entities/$e/index.ts" | Out-Null
}

# SHARED
mkdir -Force shared/api, shared/lib, shared/ui/button, shared/ui/dialog, shared/config | Out-Null
New-Item -ItemType File -Force shared/api/base.ts, shared/api/sockets.ts, shared/api/index.ts | Out-Null
New-Item -ItemType File -Force shared/lib/index.ts | Out-Null
New-Item -ItemType File -Force shared/ui/index.ts, shared/ui/button/index.ts, shared/ui/dialog/index.ts | Out-Null
New-Item -ItemType File -Force shared/config/index.ts | Out-Null

tree /a /f e:\vs-code-projects\openplaylist-mono\front-end\src
