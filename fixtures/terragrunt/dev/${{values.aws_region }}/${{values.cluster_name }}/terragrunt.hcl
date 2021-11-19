# Include all settings from the root common.hcl file
include {
  path = find_in_parent_folders("common.hcl")
}

locals {
  # Default mandatory tags for Worker group ASGs
  dirs       = split("/", path_relative_to_include())
  aws_region = lower(local.dirs[1])
}

# These are the variables we have to pass in to use the module
inputs = {

}
