#!/bin/bash

#-------------------------
#KUBE PROXY UPGRADE
#-------------------------
kube_proxy_version=$1
region=$2

#### Get AWS Accounts for image
### https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html
echo """
af-south-1	877085696533.dkr.ecr.af-south-1.amazonaws.com/
ap-east-1	800184023465.dkr.ecr.ap-east-1.amazonaws.com/
ap-northeast-1	602401143452.dkr.ecr.ap-northeast-1.amazonaws.com/
ap-northeast-2	602401143452.dkr.ecr.ap-northeast-2.amazonaws.com/
ap-northeast-3	602401143452.dkr.ecr.ap-northeast-3.amazonaws.com/
ap-south-1	602401143452.dkr.ecr.ap-south-1.amazonaws.com/
ap-southeast-1	602401143452.dkr.ecr.ap-southeast-1.amazonaws.com/
ap-southeast-2	602401143452.dkr.ecr.ap-southeast-2.amazonaws.com/
ca-central-1	602401143452.dkr.ecr.ca-central-1.amazonaws.com/
cn-north-1	918309763551.dkr.ecr.cn-north-1.amazonaws.com.cn/
cn-northwest-1	961992271922.dkr.ecr.cn-northwest-1.amazonaws.com.cn/
eu-central-1	602401143452.dkr.ecr.eu-central-1.amazonaws.com/
eu-north-1	602401143452.dkr.ecr.eu-north-1.amazonaws.com/
eu-south-1	590381155156.dkr.ecr.eu-south-1.amazonaws.com/
eu-west-1	602401143452.dkr.ecr.eu-west-1.amazonaws.com/
eu-west-2	602401143452.dkr.ecr.eu-west-2.amazonaws.com/
eu-west-3	602401143452.dkr.ecr.eu-west-3.amazonaws.com/
me-south-1	558608220178.dkr.ecr.me-south-1.amazonaws.com/
sa-east-1	602401143452.dkr.ecr.sa-east-1.amazonaws.com/
us-east-1	602401143452.dkr.ecr.us-east-1.amazonaws.com/
us-east-2	602401143452.dkr.ecr.us-east-2.amazonaws.com/
us-gov-east-1	151742754352.dkr.ecr.us-gov-east-1.amazonaws.com/
us-gov-west-1	013241004608.dkr.ecr.us-gov-west-1.amazonaws.com/
us-west-1	602401143452.dkr.ecr.us-west-1.amazonaws.com/
us-west-2	602401143452.dkr.ecr.us-west-2.amazonaws.com/
""" > all_accounts.txt

export address=$(grep ^${region} all_accounts.txt|awk '{print $2}')


echo "KUBE PROXY Version before the Upgrade..."
kubectl get daemonset kube-proxy --namespace kube-system -o=jsonpath='{$.spec.template.spec.containers[:1].image}'

echo "Updating the Kube Proxy image using KUBECTL"
kubectl set image daemonset.apps/kube-proxy \
    -n kube-system \
    kube-proxy=${address}eks/kube-proxy:v${kube_proxy_version}-eksbuild.2

echo "KUBE PROXY Version after the Upgrade..."
kubectl get daemonset kube-proxy --namespace kube-system -o=jsonpath='{$.spec.template.spec.containers[:1].image}'
