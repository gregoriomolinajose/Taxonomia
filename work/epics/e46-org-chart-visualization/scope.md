# Epic Scope: E46 - Organizational Chart Visualization

## Objective
Implement a visual organizational chart using APEXCHART (ApexTree or similar) that displays employee hierarchies, including avatar, name, surname, role (cargo), and department (color-coded). Integrate access to this chart via a new view toggle button in the DataView toolbar (List, Grid, Tree).

## In Scope
- Setup and integration of ApexCharts (or specific ApexTree module) into the application.
- Data transformation logic to convert the existing linear or relational employee data into a hierarchical tree format.
- UI implementation of the Chart Card showing Avatar, Name, Surname, Role, and Department.
- Styling node colors based on Department.
- Addition of a "Diagram/Tree View" toggle button in the `DataView` toolbar, alongside existing List and Grid views.

## Out of Scope
- Full CRUD operations within the chart itself (read-only visualization for now).
- Exporting the chart to PDF/Image (unless trivial).

## Planned Stories
- [x] **S46.1**: Setup ApexCharts / ApexTree dependencies and build the data transformer to generate the tree structure.
- [x] **S46.2**: Implement the base Chart UI Card and render the tree.
- [x] **S46.3**: Refine the visual design (Department color coding, formatting Name/Role).
- [x] **S46.4**: Refactor hierarchy logic to strictly use the `lider_directo` edge.
- [x] **S46.5**: Implement ECharts Capacity Treemap with UI layout adjustments, rich text wrapping, and OAuth scope fixes.

## Done Criteria
- The Organizational chart is available in the UI.
- Displays full hierarchy properly.
- Nodes show all requested data points and colors.
