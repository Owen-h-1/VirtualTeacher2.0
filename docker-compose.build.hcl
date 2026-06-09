variable "TAG" {
  default = "latest"
}

variable "DISTRO" {
  default = "zeroang"
}

group "default" {
  targets = ["chatbot","chatvrm","gateway"]
}

target "chatbot" {
  args = {
    TAG = null
  }
  dockerfile = "infrastructure-packaging/Dockerfile.ChatBot"
  tags = ["${DISTRO}/virtualguide-chatbot:${TAG}"]
}

target "chatvrm" {
  args = {
    TAG = null
  }
  dockerfile = "infrastructure-packaging/Dockerfile.ChatVRM"
  tags = ["${DISTRO}/virtualguide-chatvrm:${TAG}"]
}

target "gateway" {
  args = {
    TAG = null
  }
  dockerfile = "infrastructure-packaging/Dockerfile.Gateway"
  tags = ["${DISTRO}/virtualguide-gateway:${TAG}"]
}

target "chatbot-release" {
  inherits = ["chatbot"]
  platforms = ["linux/amd64", "linux/arm64"]
}

target "chatvrm-release" {
  inherits = ["chatvrm"]
  platforms = ["linux/amd64", "linux/arm64"]
}

target "gateway-release" {
  inherits = ["gateway"]
  platforms = ["linux/amd64", "linux/arm64"]
}