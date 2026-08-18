FROM mcr.microsoft.com/devcontainers/java:1-21-bookworm

# The base image ships /etc/apt/sources.list.d/yarn.list with a signing key
# that no longer verifies. Any devcontainer feature that runs `apt-get update`
# therefore fails with exit 100 and takes the entire container build with it —
# which is exactly what happened to the sshd feature, and Codespaces responded
# by silently dropping the codespace into an alpine recovery container rather
# than reporting a build failure.
#
# Yarn is already installed in the image and this project uses npm, so the
# source is dead weight even when it works.
RUN rm -f /etc/apt/sources.list.d/yarn.list
