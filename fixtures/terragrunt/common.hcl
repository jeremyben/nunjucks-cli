# Primary EKS Terragrunt configuration that's included
# in each stach. Due to the the nature of this repo almost every stack
# is identical.
# --------------------------------------------------------------------


# local variables. these aren't passed into terraform.
# see inputs below for what is actually passed into tf.
# -----------------------------------------------------
locals {
  channel           = ${{values.channel | dump}}        # Refer - WH standard tagging  documents
  product           = "eks"
  classification    = ${{values.classification | dump}} # Refer - WH standard tagging  documents
  common_infra_role = "williamhill-delegated-write"     # Default role to which access is provided
  org               = "wh"                              # Mostly used for bucket prefix
  costcentre       =  ${{values.costcentre | dump}}     # Refer - WH standard tagging  documents
  owner             = ${{values.owner | dump}}          # Refer - WH standard tagging  documents
  subdivision       = ${{values.channel | dump}}        # Refer - WH standard tagging  documents
  tier              = "internal"                        # Product currently does not expose EKS API public.
  approval          = "N/A"                             # Only for an SG


  # Getting the environment, region and EKS Cluster/Stack name
  dirs       = split("/", path_relative_to_include())
  env        = lower(local.dirs[0]) # dir structure <repo>/<env>/<region>/<cluster_name>/
  aws_region = lower(local.dirs[1]) # dir structure <repo>/<env>/<region>/<cluster_name>/
  stack_name = lower(local.dirs[2]) # dir structure <repo>/<env>/<region>/<cluster_name>/


  ## Default EKS Deployment repo
  product_git_repo    = "git::https://gitlab.com/williamhillplc/technical-services/shared-tooling/terraform-products/eks.git"
  product_git_ref     = "0.32.0"

  key_pair = "" ## Provide EC2 keypair to connect to Worker Node if needed

  # Compliance Tags
  # ---------------
  required_tags = {
    SubDivision    = local.subdivision
    Product        = local.product
    Classification = "NonPublic"
    CardData       = "No"
    Migrated       = "No"
    Approval       = local.approval
    Tier           = local.tier
  }

  additional_tags = {
    CostCentre = local.costcentre
  }


  # Default IAM role which will provide access to EKS
  # --------------------
  common_infra_role_arn = "arn:aws:iam::${get_aws_account_id()}:role/${local.common_infra_role}"
  default_map_roles = [
    {
      rolearn  = local.common_infra_role_arn
      username = "delegated-write"
      groups   = ["system:masters"]
    }
  ]


  ## These are the default tags added to Worker ASGs needed to enable Cluster Autoscaler on those
  additional_worker_node_asg_tags = [
    {
      "key"                 = "k8s.io/cluster-autoscaler/enabled"
      "value"               = "true"
      "propagate_at_launch" = "false"
    },
    {
      "key"                 = "k8s.io/cluster-autoscaler/${local.stack_name}"
      "value"               = "true"
      "propagate_at_launch" = "false"
    },
  ]

  #Terraform state bucket and dynamodb configs
  bucket_name         = "${local.org}-${local.channel}-infra-${local.env}-${local.aws_region}-tfstate"
  dynamodb_table_name = "${local.org}-${local.channel}-infra-${local.env}-${local.aws_region}-tfstate-lock"
  key_name            = "${local.channel}/${local.product}/${local.env}/${local.aws_region}/${local.stack_name}/terraform.tfstate"

}


## Call terraform source modules from COE tagged git repo
terraform {
  source = "${local.product_git_repo}?ref=${local.product_git_ref}"
}



# Remote State Configuration
# --------------------------
remote_state {

  disable_init = tobool(get_env("DISABLE_INIT", "false"))
  backend      = "s3"

  config = {
    encrypt             = true
    bucket              = local.bucket_name
    dynamodb_table      = local.dynamodb_table_name
    dynamodb_table_tags = local.required_tags
    key                 = local.key_name
    region              = local.aws_region
  }

  #for terraform to know it must use s3 backend
  #we should generate a file and place it in the product
  #before running.
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
}


# Configure Terragrunt to generate the aws providers file
generate "providers" {
  if_exists = "overwrite_terragrunt"
  path      = "providers.tf"

  contents = <<EOF
provider "aws" {
  region       = "${local.aws_region}"
}
EOF
}


# Inputs to Terraform stacks
inputs = {

  # non specific eks inputs.
  # ------------------------
  org                = local.org
  product            = local.product
  channel            = local.channel
  environment        = local.env
  aws_region         = local.aws_region
  channel_account_id = "${get_aws_account_id()}"
  gitrepo            = local.product_git_repo
  git_ref            = local.product_git_ref
  required_tags      = local.required_tags
  additional_tags    = local.additional_tags
  common_infra_role_arn = local.common_infra_role_arn
  route53_zone_id       = "" # not used in upstream TF but needs var
  route53_zone_name     = ""#  not used in upstream TF but needs var


  # ------------------------
  kubelet_extra_args_spot         = "--node-labels=lifecycle=Ec2Spot"                                                                # Default node labels added for Spot Instance ASG
  kubelet_extra_args_ondemand     = "--node-labels=lifecycle=OnDemand --register-with-taints=OnDemandInstance=true:PreferNoSchedule" # Default node labels and taints added for OnDemand Instance ASG
  map_roles                       = local.default_map_roles
  name                            = local.stack_name
  channel                         = local.channel
  additional_worker_node_asg_tags = local.additional_worker_node_asg_tags
  key_name                        = local.key_pair
  efs_enabled                     = false


  # EKS Control Plane & Worker Configuration
  # ----------------------------------------
  eks_ami_filter = "amazon-eks-node-1.21"

  # Refer https://gitlab.com/williamhillplc/platform-engineering/cpe/playground/eks-setup/-/blob/master/docs/MAINTENANCE.md#aws-eks-pre-installed-add-ons
  cluster_version    = "1.21"
  kube_proxy_version = "1.21.2"
  core_dns_version   = "1.8.3"


  ####################### Default ASGs Settings ###################################################
  # Stack creates default Autoscaling groups with OnDemand and Spot ASGs group on each AZs        #
  # ----------------------------------------------------------------------------------------------#
  #1. ###################### Default OnDemand ASGs Settings ##########################################
  on_demand_instance_type = "m5.large"
  asg_desired_capacity    = 1
  asg_min_size            = 0
  asg_max_size            = 64

  #2. ###################### Default Spot ASGs Settings ##########################################
  spot_asg_desired_capacity = 1
  spot_asg_min_size         = 1
  spot_asg_max_size         = 64
  spot_instance_pools       = 1

  spot_instance_types = [
    "m5.large",
    "m5a.large",
    "m5d.large",
    "m5ad.large"
  ]

  ## Default enables IAM roles for EKS Addons
  # creates IAM role with - <region>-<clusterName>-<csi/externaldns/autoscaler/gitlabrunners> - format
  iam_addon_autoscaler        = true
  iam_addon_aws_lb_controller = true
  iam_addon_csi               = true
  iam_addon_externaldns       = true
  iam_addon_gitlabrunners     = true
  iam_addon_aws_pca_issuer    = true

}
