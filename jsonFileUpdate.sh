#!/bin/bash

# jq 설치 여부 확인 및 설치
if ! command -v jq &> /dev/null; then
    echo "jq가 설치되어 있지 않습니다. 설치를 진행합니다."
    sudo apt-get update
    sudo apt-get install -y jq
else
    echo "jq가 이미 설치되어 있습니다."
fi


# JSON 파일 경로 설정
json_files=(
  "utils/connection-profile/connection-nsmarts.json"
  "utils/connection-profile/connection-vice.json"
  "utils/connection-profile/connection-vice-kr.json"
)


# JSON 파일 경로 설정
json_files=(
  "utils/connection-profile/connection-nsmarts.json"
  "utils/connection-profile/connection-vice.json"
  "utils/connection-profile/connection-vice-kr.json"
)

# 각 조직의 keystore 디렉토리 설정
keystore_dirs=(
  "../potatocs-bc/potatocs-network/organizations/peerOrganizations/nsmarts.co.kr/admin/msp/keystore"
  "../potatocs-bc/potatocs-network/organizations/peerOrganizations/vice.com/admin/msp/keystore"
  "../potatocs-bc/potatocs-network/organizations/peerOrganizations/vice-kr.co.kr/admin/msp/keystore"
)

orgs=("NsmartsMSP" "ViceMSP" "ViceKRMSP")

# 각 JSON 파일에 대해 작업 수행
for json_file in "${json_files[@]}"; do
  for i in "${!orgs[@]}"; do
    org=${orgs[$i]}
    keystore_dir=${keystore_dirs[$i]}
    private_key_file=$(ls "$keystore_dir" | head -n 1)
    private_key_path="$keystore_dir/$private_key_file"

    if [ -f "$private_key_path" ]; then
      # jq를 사용하여 JSON 수정
      jq --arg org "$org" --arg private_key_path "$private_key_path" \
      '.organizations[$org].adminPrivateKey.path = $private_key_path' \
      "$json_file" > tmp.$$.json && mv tmp.$$.json "$json_file"
    else
      echo "No private key file found in $keystore_dir"
    fi
  done
  echo "Updated adminPrivateKey paths in $json_file"
done