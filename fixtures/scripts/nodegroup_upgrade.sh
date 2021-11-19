#!/bin/bash -e

set -o pipefail

export TIME_FORMAT=$(date +"%Y-%m-%d %H:%M:%s")
export cluster_name=$1
export region=$2
export cluster_version=$(aws eks describe-cluster --name $cluster_name | jq -r .cluster.version)
export LOG_PATH=nodegroup.log

log (){
  msg=$*
  echo "${TIME_FORMAT} -  $1" |tee -a ${LOG_PATH}
}


function wait_for_update {
    id=$1
    nodegroup=$2
    maybe_nodegroup=''
    if test -n "$nodegroup"; then
        maybe_nodegroup="--nodegroup-name $nodegroup"
    fi
    status=InProgress
    while test "$status" = InProgress; do
        log  "Waiting for NodeGroup upgrade - $nodegroup .."
        status=$(aws eks describe-update --name $cluster_name --update-id $id $maybe_nodegroup --region ${region}| jq -r .update.status)
        sleep 10
    done
    if test "$status" != Successful; then
        exit 1
    fi
}



nodegroups=$(aws eks list-nodegroups --cluster-name $cluster_name --region ${region} | jq -r .nodegroups[])
for nodegroup_name in $nodegroups; do
    nodegroup_version=$(aws eks describe-nodegroup --cluster-name $cluster_name --nodegroup-name $nodegroup_name --region ${region}| jq -r .nodegroup.version)
    log  "Updating managed nodegroup '$nodegroup_name' version to $cluster_version"
    update=$(aws eks update-nodegroup-version --cluster-name $cluster_name --nodegroup-name $nodegroup_name --kubernetes-version $cluster_version --region ${region} | jq -r .update.id)
    wait_for_update $update $nodegroup_name
done
