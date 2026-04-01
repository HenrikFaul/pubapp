# App Repo Governance Template

This template is preconfigured to consume the shared governance pack from `HenrikFaul/governance`.

## Initial subtree command
```bash
git subtree add --prefix .governance https://github.com/HenrikFaul/governance.git main --squash
```

## Regenerate AI instruction files
```bash
node .governance/tools/generate-instructions.mjs
```
