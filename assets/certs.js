// Catalogue of every exam on the site. The real-exam figures (question count,
// time, pass mark) are what the vendor publishes, used to scale the timer and
// set the pass line on our mocks. Question banks live in /data/<id>.js.
window.CERTS = [
  {
    id: 'itil', vendor: 'PeopleCert', name: 'ITIL Foundation', code: 'ITIL 4 / Version 5',
    level: 'Foundation', colour: '#f0a500',
    blurb: 'Service value system, guiding principles, practices and key ITSM terminology.',
    real: { questions: 40, minutes: 60, pass: 65, passLabel: '26 / 40 (65%)' },
    domains: ['Key concepts', 'Guiding principles', 'Four dimensions', 'Service value system', 'Practices'],
    note: 'Covers the core concepts and practices that carry across ITIL 4 and ITIL Version 5 Foundation.'
  },
  {
    id: 'ccna', vendor: 'Cisco', name: 'CCNA', code: '200-301 v1.1',
    level: 'Associate', colour: '#049fd9',
    blurb: 'Subnetting, switching, routing, OSPF, wireless, ACLs, NAT and automation basics.',
    real: { questions: 100, minutes: 120, pass: 82, passLabel: 'Not published (aim for 82%+)' },
    domains: ['Network fundamentals', 'Network access', 'IP connectivity', 'IP services', 'Security fundamentals', 'Automation'],
    note: 'v1.1 runs until 2 Feb 2027, when CCNA v2.0 takes over.'
  },
  {
    id: 'az104', vendor: 'Microsoft', name: 'Azure Administrator', code: 'AZ-104',
    level: 'Associate', colour: '#0078d4',
    blurb: 'Entra ID, RBAC, storage, VMs, VNets, NSGs, backup and monitoring.',
    real: { questions: 50, minutes: 100, pass: 70, passLabel: '700 / 1000' },
    domains: ['Identities & governance', 'Storage', 'Compute', 'Networking', 'Monitor & maintain']
  },
  {
    id: 'az900', vendor: 'Microsoft', name: 'Azure Fundamentals', code: 'AZ-900',
    level: 'Fundamentals', colour: '#0078d4',
    blurb: 'Cloud concepts, core Azure services, pricing, SLAs and governance.',
    real: { questions: 45, minutes: 45, pass: 70, passLabel: '700 / 1000' },
    domains: ['Cloud concepts', 'Architecture & services', 'Management & governance']
  },
  {
    id: 'ms900', vendor: 'Microsoft', name: 'Microsoft 365 Fundamentals', code: 'MS-900',
    level: 'Fundamentals', colour: '#d83b01',
    blurb: 'M365 apps and services, security, compliance, licensing and support.',
    real: { questions: 45, minutes: 45, pass: 70, passLabel: '700 / 1000' },
    domains: ['Cloud concepts', 'M365 apps & services', 'Security & compliance', 'Pricing & support']
  },
  {
    id: 'md102', vendor: 'Microsoft', name: 'Endpoint Administrator', code: 'MD-102',
    level: 'Associate', colour: '#0078d4',
    blurb: 'Intune, Autopilot, compliance and config profiles, updates and app deployment.',
    real: { questions: 50, minutes: 100, pass: 70, passLabel: '700 / 1000' },
    domains: ['Deploy Windows', 'Manage identity & compliance', 'Manage & maintain devices', 'Manage applications']
  },
  {
    id: 'sc900', vendor: 'Microsoft', name: 'Security, Compliance & Identity', code: 'SC-900',
    level: 'Fundamentals', colour: '#5c2d91',
    blurb: 'Zero Trust, Entra ID, Defender, Sentinel and Purview fundamentals.',
    real: { questions: 45, minutes: 45, pass: 70, passLabel: '700 / 1000' },
    domains: ['Concepts', 'Entra', 'Security solutions', 'Compliance solutions']
  },
  {
    id: 'aplus1', vendor: 'CompTIA', name: 'A+ Core 1', code: '220-1201',
    level: 'Entry', colour: '#c8202f',
    blurb: 'Hardware, mobile devices, networking, virtualisation and troubleshooting.',
    real: { questions: 90, minutes: 90, pass: 75, passLabel: '675 / 900' },
    domains: ['Mobile devices', 'Networking', 'Hardware', 'Virtualisation & cloud', 'Troubleshooting']
  },
  {
    id: 'aplus2', vendor: 'CompTIA', name: 'A+ Core 2', code: '220-1202',
    level: 'Entry', colour: '#c8202f',
    blurb: 'Windows, other OSes, security, software troubleshooting and procedures.',
    real: { questions: 90, minutes: 90, pass: 78, passLabel: '700 / 900' },
    domains: ['Operating systems', 'Security', 'Software troubleshooting', 'Operational procedures']
  },
  {
    id: 'netplus', vendor: 'CompTIA', name: 'Network+', code: 'N10-009',
    level: 'Intermediate', colour: '#c8202f',
    blurb: 'OSI, ports, cabling, routing, wireless, network security and troubleshooting.',
    real: { questions: 90, minutes: 90, pass: 80, passLabel: '720 / 900' },
    domains: ['Concepts', 'Implementation', 'Operations', 'Security', 'Troubleshooting']
  },
  {
    id: 'secplus', vendor: 'CompTIA', name: 'Security+', code: 'SY0-701',
    level: 'Intermediate', colour: '#c8202f',
    blurb: 'Threats, crypto, identity, architecture, incident response and governance.',
    real: { questions: 90, minutes: 90, pass: 83, passLabel: '750 / 900' },
    domains: ['General concepts', 'Threats & mitigations', 'Architecture', 'Operations', 'Program management']
  },
  {
    id: 'awssaa', vendor: 'AWS', name: 'Solutions Architect Associate', code: 'SAA-C03',
    level: 'Associate', colour: '#ff9900',
    blurb: 'Resilient, secure, high-performing and cost-optimised AWS architectures.',
    real: { questions: 65, minutes: 130, pass: 72, passLabel: '720 / 1000' },
    domains: ['Secure architectures', 'Resilient architectures', 'High-performing architectures', 'Cost-optimised architectures']
  }
];

// Question banks register themselves here when their script loads.
window.MOCKS = {
  banks: {},
  register(id, questions) { this.banks[id] = questions; }
};
