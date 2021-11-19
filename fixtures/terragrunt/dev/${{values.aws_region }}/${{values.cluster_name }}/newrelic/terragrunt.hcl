# --------------------------------------------------------------------
locals {
  infra_org     = "wh"
  channel       = "platform-eng"
  env           = "dev"
  aws_region    = ${{ values.aws_region }}
  stack_name    = "sample-eks01"
  config_subdir = "newrelic"
  product       = "eks"
  subdivision   = "TechOps"
  tier          = "Internal"

  full_cluster_name = "${local.channel}-${local.env}-${local.aws_region}-${local.stack_name}" # <channel>-<env>-<awsRegion>-<clusterName>

  ## variables
  newrelic_api_key_encrypted    = "AQICAHizz2Vsc+---FILL-ME-IN---eYxfA=="
  newrelic_account_id_encrypted = "AQICAHizz2Vsc+---FILL-ME-IN---+D2h359EJfqJ+fs"

  #slack_enabled = true
  #slack_webhook_url  = "https://hooks.slack.com/services/T02D11B4K/B028L2E/GJo2bkx6u7"

  #pagerduty_enabled = true
  #pagerduty_token = "AXXX..."
  #pagerduty_service_key = "AXXXXX>....."

  #Terraform state bucket and dynamodb configs
  bucket_name         = "${local.infra_org}-${local.channel}-infra-${local.env}-${local.aws_region}-${local.config_subdir}-tfstate"
  dynamodb_table_name = "${local.infra_org}-${local.channel}-infra-${local.env}-${local.aws_region}-${local.config_subdir}-tfstate-lock"
  key_name            = "${local.channel}/${local.product}/${local.env}/${local.aws_region}/${local.stack_name}/${local.config_subdir}/terraform.tfstate"

  # ---------------
  required_tags = {
    CardData       = "No"
    Classification = "NonPublic"
    Environment    = local.env
    Product        = local.product
    Tier           = local.tier
    Migrated       = "No"
    SubDivision    = local.subdivision
  }
}

## Call terraform source modules from CPE tagged git repo
terraform {
  source = "git::https://gitlab.com/williamhillplc/platform-engineering/cpe/playground/eks-setup.git//terraform?ref=master"
  # you can also use specific `ref` tag instead of `master` - can be found - (https://gitlab.com/williamhillplc/platform-engineering/cpe/playground/eks-setup/-/tree/master#release-tags)
}

## Configuration for S3 backend
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
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
}

##### These are the detault input variables which needs to pass
inputs = {
  aws_region                    = local.aws_region
  channel                       = local.channel
  environment                   = local.env
  cluster_name                  = local.full_cluster_name
  newrelic_account_id_encrypted = local.newrelic_account_id_encrypted
  newrelic_api_key_encrypted    = local.newrelic_api_key_encrypted

  #slack_enabled = local.slack_enabled
  #slack_webhook_url   = local.slack_webhook_url

  #pagerduty_enabled = local.pagerduty_enabled
  #pagerduty_service_key = local.pagerduty_service_key
  #pagerduty_token = local.pagerduty_token
}
