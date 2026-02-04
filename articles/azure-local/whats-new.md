# What's new in hyperconverged deployments of Azure Local?

This article lists the features and improvements that are available in hyperconverged deployments of Azure Local (formerly Azure Stack HCI). The latest version of Azure Local solution focuses on cloud-based deployment and updates, cloud-based monitoring, a new and simplified experience for Azure Local virtual machine (VM) management, security, and more.

## Features and improvements in 2601

The January 2026 release of hyperconverged deployments of Azure Local is version 12.2601.1002.503. For more information, see [Release information summary](https://learn.microsoft.com/en-us/azure/azure-local/release-information-23h2?view=azloc-2601). This release includes various reliability improvements and other bug fixes.

### Rack-aware cluster support is now generally available

Rack-aware clustering is now generally available (GA) for new Azure Local deployments. This feature enables you to deploy highly available clusters across multiple racks or fault domains within a single datacenter, with support for latencies of 1 millisecond or less between racks. Rack-aware clustering provides:

- Improved fault tolerance across physical infrastructure boundaries
- Enhanced high availability for business-critical workloads
- Simplified cluster deployment across datacenter infrastructure

### Azure Local VM Connect now available

Azure Local VM Connect is a new feature that enables secure, passwordless connections to virtual machines running on Azure Local clusters. This simplified connection experience improves operational efficiency and security posture for hybrid workloads.

### Enhanced diagnostics and log collection

New diagnostics capabilities enable proactive troubleshooting and performance monitoring:

- Automated log collection for common issues
- Enhanced telemetry and health checks
- Improved diagnostic portal experience for faster root cause analysis

### Security improvements

This release includes several security enhancements:

- Updated cryptographic standards alignment
- Enhanced certificate management
- Improved cluster communication security

## Previous features

For information about features released in previous versions, see the following articles:

- [What's new in Azure Local version 23H2](https://learn.microsoft.com/en-us/azure/azure-local/release-information-23h2?view=azloc-2601)
- [What's new in Azure Stack HCI version 22H2](https://learn.microsoft.com/en-us/azure-stack/hci/release-notes-23h2)

## Next steps

- [Plan your Azure Local deployment](https://learn.microsoft.com/en-us/azure/azure-local/plan-deployment)
- [Deploy Azure Local](https://learn.microsoft.com/en-us/azure/azure-local/deploy)
