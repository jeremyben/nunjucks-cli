#!/usr/bin/env bash
# See	https://github.com/aws/eks-charts/pull/192
#	https://github.com/aws/amazon-vpc-cni-k8s/tree/master/charts/aws-vpc-cni#adopting-the-existing-aws-node-resources-in-an-eks-cluster
set -euo pipefail

# Don't import the crd. Helm cant manage the lifecycle of it anyway.
for kind in daemonset clusterrole clusterrolebinding serviceaccount; do
  echo "setting annotations and labels on $kind/aws-node"
  kubectl -n kube-system annotate --overwrite $kind aws-node meta.helm.sh/release-name=aws-vpc-cni
  kubectl -n kube-system annotate --overwrite $kind aws-node meta.helm.sh/release-namespace=kube-system
  kubectl -n kube-system label --overwrite $kind aws-node app.kubernetes.io/managed-by=Helm
done
