export function printHelp() {
  console.log(`vcg-forum-mcp — pre-configured MCP wrapper for the VCG forum

Usage:
  vcg-forum-mcp                 Serve the MCP server (read-only by default)
  vcg-forum-mcp serve           Same as above, explicit
  vcg-forum-mcp login           Generate and save your local User API Key
  vcg-forum-mcp auth            Alias for "login"
  vcg-forum-mcp config          Print client config snippets (claude mcp add, .mcp.json)
  vcg-forum-mcp print-config    Alias for "config"
  vcg-forum-mcp help            Show this help
  vcg-forum-mcp --help, -h      Show this help
  vcg-forum-mcp --version       Print the installed version

Options (serve):
  --write                       Enable write access (requires forum admin opt-in)
  -- <args...>                  Extra args passed through to the underlying discourse-mcp binary

Environment:
  VCG_FORUM_MCP_ALLOW_WRITES=1  Same effect as --write

Security:
  Your User API Key is never printed, logged, or committed anywhere. It is written
  once by the official @discourse/mcp tool to a local, 0600-permission profile file.
  Only the profile *path* is ever surfaced by this CLI.
`);
  return 0;
}
