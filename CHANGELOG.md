# Changelog

## [1.2.0] - 2024-07-01

### Added
- **Nested Pseudo Folders**: You can now create pseudo folders inside other pseudo folders
  - Drag and drop pseudo folders into other pseudo folders to create hierarchy
  - Right-click on a pseudo folder to create a child folder
  - Maximum nesting depth of 10 levels to prevent performance issues
  - Visual indicator showing number of nested folders

### Fixed
- **Critical Bug Fix**: Resolved "Element with id already registered" error
  - Fixed duplicate tree item registration when same files appear in multiple pseudo folders
  - Implemented unique composite ID generation (e.g., `pseudo1:/path/file.svg`)
  - Same files can now safely exist in multiple pseudo folders without conflicts
  - Tree item IDs now use format: `{parentPseudoFolderId}:{filePath}`
  - Zero performance impact from the fix

### Enhanced
- **Data Migration**: Automatic migration from v1 to v2 data format while maintaining backward compatibility
- **Safety Features**: 
  - Circular reference detection prevents infinite loops
  - Atomic file writes with backup/restore mechanism
  - Comprehensive validation before saving data
  - Prevention of dropping folders into their own descendants

### Improved
- **Error Handling**: Enhanced error messages and recovery mechanisms
- **Performance**: Optimized tree rendering for nested structures
- **Data Integrity**: Rolling backups (last 3 versions) for data protection

## [1.1.0] - Previous Release
- Enhanced pseudo folders functionality with validation and new commands
- Updated icon and version in package.json

## [1.0.0] - Initial Release
- Basic pseudo folder functionality
- Drag and drop support
- File organization without modifying file system