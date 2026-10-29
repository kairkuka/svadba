#!/bin/zsh
cd "$(dirname "$0")" || exit 1
npx eas-cli build --platform ios --profile production
echo
echo "iOS build command finished. Press Enter to close."
read
