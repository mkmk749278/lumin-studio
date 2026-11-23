#!/data/data/com.termux/files/usr/bin/bash
# One command, run once in Termux on the owner's phone: sets every repo secret Lumin Studio's workflows need.
#   bash <(curl -fsSL https://raw.githubusercontent.com/mkmk749278/lumin-studio/main/scripts/termux_secrets.sh)
# Sets on mkmk749278/lumin-studio:
#   GDRIVE_RCLONE_TOKEN   Google Drive (rclone authorize opens a sign-in link; allow it, come back to Termux)
#   MODAL_TOKEN_ID        Modal: modal.com -> Settings -> API Tokens -> New Token (shows an ID and a Secret)
#   MODAL_TOKEN_SECRET
# Values are typed or generated here and go straight to GitHub; nothing is printed or saved to a file.
# Re-run any time to replace a secret; press Enter at a prompt to keep that secret as it is.
set -euo pipefail
REPO=mkmk749278/lumin-studio
say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

say "1/4  Tools (gh, rclone)"
command -v gh >/dev/null && command -v rclone >/dev/null || pkg install -y gh rclone

say "2/4  GitHub sign-in"
gh auth status -h github.com >/dev/null 2>&1 || gh auth login -h github.com -p https -w

say "3/4  Google Drive token (GDRIVE_RCLONE_TOKEN)"
read -r -p "Create/replace the Drive token now? [Y/n] " ans
if [[ ! ${ans:-Y} =~ ^[Nn] ]]; then
  echo "A sign-in link appears below: open it, choose your Google account, Allow, then come back here."
  tok=$(rclone authorize "drive" 2>&1 | tee /dev/stderr | sed -n '/--->/,/<---/p' | sed '1d;$d' | tr -d '\n')
  [[ $tok == *refresh_token* ]] || { echo "No token came back from rclone; run this again."; exit 1; }
  printf '%s' "$tok" | gh secret set GDRIVE_RCLONE_TOKEN -R "$REPO"
  unset tok
fi

say "4/4  Modal token (modal.com -> Settings -> API Tokens -> New Token)"
read -r -p "MODAL_TOKEN_ID (starts ak-, Enter to skip): " mid
if [[ -n $mid ]]; then
  read -r -s -p "MODAL_TOKEN_SECRET (starts as-, hidden): " msec; echo
  [[ $mid == ak-* && $msec == as-* ]] || { echo "Those don't look like a Modal token pair (ak-… / as-…)."; exit 1; }
  printf '%s' "$mid" | gh secret set MODAL_TOKEN_ID -R "$REPO"
  printf '%s' "$msec" | gh secret set MODAL_TOKEN_SECRET -R "$REPO"
  unset mid msec
fi

say "Secrets now on $REPO"
gh secret list -R "$REPO"
echo "Done. Tell Claude: secrets set."
