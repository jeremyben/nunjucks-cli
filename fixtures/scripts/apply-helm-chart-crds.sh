#!/usr/bin/env bash
set -eou pipefail

readonly chart=${1?Chart required in the form repo/chart-name}
readonly version=${2?Chart version required}

readonly chart_name=${chart#*/}

rm -rf /tmp/${chart_name}
helm pull ${chart} --untar --untardir /tmp --version ${version}
kubectl apply -f /tmp/${chart_name}/crds
