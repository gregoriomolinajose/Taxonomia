# Epic Scope: E46 - Organizational Chart Visualization

## Objective
Implement a visual organizational chart using APEXCHART (ApexTree or similar) that displays employee hierarchies, including avatar, name, surname, role (cargo), and department (color-coded).

## In Scope
- Setup and integration of ApexCharts (or specific ApexTree module) into the application.
- Data transformation logic to convert the existing linear or relational employee data into a hierarchical tree format.
- UI implementation of the Chart Card showing Avatar, Name, Surname, Role, and Department.
- Styling node colors based on Department.

## Out of Scope
- Full CRUD operations within the chart itself (read-only visualization for now).
- Exporting the chart to PDF/Image (unless trivial).

## Planned Stories
- **S46.1**: Setup ApexCharts / ApexTree dependencies and build the data transformer to generate the tree structure.
- **S46.2**: Implement the base Chart UI Card and render the tree.
- **S46.3**: Refine the visual design (Department color coding, formatting Name/Role).

## Done Criteria
- The Organizational chart is available in the UI.
- Displays full hierarchy properly.
- Nodes show all requested data points and colors.
