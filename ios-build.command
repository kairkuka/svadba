#!/bin/zsh
cd /Users/kairkuka/Documents/svadba/mobile || exit 1
npx eas-cli build --platform ios --profile production
echo
echo "iOS build command finished. Press Enter to close."
read
