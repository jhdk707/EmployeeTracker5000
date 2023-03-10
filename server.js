// import mysql2
const mysql = require("mysql2");
// import inquirer
const inquirer = require("inquirer");
// import console.table
const cTable = require("console.table");
// import FS
const fs = require("fs");
// read in the schema.sql file as a string
const schema = fs.readFileSync("./db/schema.sql", "utf8");

// Create connection with mysql workbench
const connection = mysql.createConnection({
  host: "localhost",
  port: "3306",
  user: "root",
  password: "root",
  database: "employeeTracker_db",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("connected as id " + connection.threadId);
  afterConnection();
});

// function after connection is established and welcome image shows
afterConnection = () => {
  console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
  console.log("#                                 #");
  console.log("#  ==! EMPLOYEE TRACKER 5000 !==  #");
  console.log("#                                 #");
  console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
  promptUser();
};

// inquirer prompt for first action
const promptUser = () => {
  inquirer
    .prompt([
      {
        type: "list",
        name: "choices",
        message: "What would you like to do?",
        choices: [
          "View all departments",
          "View all roles",
          "View all employees",
          "Add a department",
          "Add a role",
          "Add an employee",
          "Update an employee role",
          "Update an employee manager",
          "View employees by department",
          "Delete a department",
          "Delete a role",
          "Delete an employee",
          "No Action",
        ],
      },
    ])
    .then((answers) => {
      const { choices } = answers;

      if (choices === "View all departments") {
        showDepartments();
      }

      if (choices === "View all roles") {
        showRoles();
      }

      if (choices === "View all employees") {
        showEmployees();
      }

      if (choices === "Add a department") {
        addDepartment();
      }

      if (choices === "Add a role") {
        addRole();
      }

      if (choices === "Add an employee") {
        addEmployee();
      }

      if (choices === "Update an employee role") {
        updateEmployee();
      }

      if (choices === "Update an employee manager") {
        updateManager();
      }

      if (choices === "View employees by department") {
        employeeDepartment();
      }

      if (choices === "Delete a department") {
        deleteDepartment();
      }

      if (choices === "Delete a role") {
        deleteRole();
      }

      if (choices === "Delete an employee") {
        deleteEmployee();
      }

      if (choices === "No Action") {
        connection.end();
      }
    });
};

// SHOW ALL DEPARTMENTS
function showDepartments() {
  console.log("Showing all departments...\n");
  connection
    .promise()
    .query("SELECT * FROM department")
    .then(([rows]) => {
      console.table(rows);
      afterConnection();
    })
    .catch((err) => {
      console.log(err);
      afterConnection();
    });
}

// SHOW ALL ROLES
async function showRoles() {
  try {
    const [rows] = await connection.promise().query("SELECT * FROM role");
    console.table(rows);
    afterConnection();
  } catch (err) {
    console.log(err);
    afterConnection();
  }
}

// SHOW ALL EMPLOYEES
showEmployees = () => {
  console.log("Showing all employees...\n");
  const sql = `SELECT employee.id, 
                        employee.first_name, 
                        employee.last_name, 
                        role.title, 
                        department.name AS department,
                        role.salary, 
                        CONCAT (manager.first_name, " ", manager.last_name) AS manager
                 FROM employee
                        LEFT JOIN role ON employee.role_id = role.id
                        LEFT JOIN department ON role.department_id = department.id
                        LEFT JOIN employee manager ON employee.manager_id = manager.id`;

  connection
    .promise()
    .query(sql)
    .then((rows) => {
      console.table(rows[0]);
      promptUser();
    })
    .catch((err) => console.error(err));
};

// ADD A DEPARTMENT
addDepartment = () => {
  inquirer
    .prompt([
      {
        type: "input",
        name: "addDept",
        message: "What department do you want to add?",
        validate: (addDept) => {
          if (addDept) {
            return true;
          } else {
            console.log("Please enter a department");
            return false;
          }
        },
      },
    ])
    .then((answer) => {
      const sql = `INSERT INTO department (name)
                  VALUES (?)`;
      connection.query(sql, answer.addDept, (err, result) => {
        if (err) throw err;
        console.log("Added " + answer.addDept + " to departments!");

        showDepartments();
      });
    });
};

// ADD A ROLE
async function addRole() {
  // Get all departments
  const [departmentRows] = await connection
    .promise()
    .query("SELECT id, name FROM department");
  const departments = departmentRows.map(({ id, name }) => ({
    name,
    value: id,
  }));

  // Ask the user for the new role's details
  const { title, salary, departmentId } = await inquirer.prompt([
    {
      type: "input",
      name: "title",
      message: "What role do you want to add?",
    },
    {
      type: "input",
      name: "salary",
      message: "What is the salary of this role?",
      validate: (value) => !isNaN(value) || "Please enter a valid number.",
    },
    {
      type: "list",
      name: "departmentId",
      message: "Which department does this role belong to?",
      choices: departments,
    },
  ]);

  // Add the new role to the database
  await connection.promise().query("INSERT INTO role SET ?", {
    title,
    salary,
    department_id: departmentId,
  });

  console.log(`Added ${title} to roles!`);
  await showRoles();
}

// ADD EMPLOYEE
const addEmployee = () => {
  inquirer
    .prompt([
      {
        type: "input",
        name: "firstName",
        message: "What is the employee's first name?",
      },
      {
        type: "input",
        name: "lastName",
        message: "What is the employee's last name?",
      },
    ])
    .then(async (answer) => {
      const params = [answer.firstName, answer.lastName];

      // GET ROLES FROM ROLES TABLE
      const [rows, fields] = await connection
        .promise()
        .query("SELECT id, title FROM role");
      const roles = rows.map(({ id, title }) => ({ name: title, value: id }));

      inquirer
        .prompt([
          {
            type: "list",
            name: "role",
            message: "What is the employee's role?",
            choices: roles,
          },
        ])
        .then((roleChoice) => {
          const role = roleChoice.role;
          params.push(role);

          const managerSql = `SELECT * FROM employee`;

          connection
            .promise()
            .query(managerSql)
            .then(([rows, fields]) => {
              const managers = rows.map(({ id, first_name, last_name }) => ({
                name: first_name + " " + last_name,
                value: id,
              }));

              inquirer
                .prompt([
                  {
                    type: "list",
                    name: "manager",
                    message: "Who is the employee's manager?",
                    choices: managers,
                  },
                ])
                .then((managerChoice) => {
                  const manager = managerChoice.manager;
                  params.push(manager);

                  const sql = `INSERT INTO employee (first_name, last_name, role_id, manager_id)
                          VALUES (?, ?, ?, ?)`;

                  connection
                    .promise()
                    .query(sql, params)
                    .then(([rows, fields]) => {
                      console.log("Employee has been added!");
                      showEmployees();
                    })
                    .catch((err) => {
                      throw err;
                    });
                });
            })
            .catch((err) => {
              throw err;
            });
        });
    });
};

// UPDATE EMPLOYEE
async function updateEmployee() {
  // Get all employees
  const [rows] = await connection.promise().query("SELECT * FROM employee");
  const employees = rows.map(({ id, first_name, last_name }) => ({
    name: `${first_name} ${last_name}`,
    value: id,
  }));

  // Get all roles
  const [roleRows] = await connection.promise().query("SELECT * FROM role");
  const roles = roleRows.map(({ id, title }) => ({
    name: title,
    value: id,
  }));

  // Ask the user which employee to update and which role to set
  const { employeeId, roleId } = await inquirer.prompt([
    {
      type: "list",
      name: "employeeId",
      message: "Which employee do you want to update?",
      choices: employees,
    },
    {
      type: "list",
      name: "roleId",
      message: "Which role do you want to set for the employee?",
      choices: roles,
    },
  ]);

  // Update the employee's role
  await connection
    .promise()
    .query("UPDATE employee SET role_id = ? WHERE id = ?", [
      roleId,
      employeeId,
    ]);

  console.log("Employee role updated!");

  // Show all employees with their roles
  await showEmployees();
}

// UPDATE EMPLOYEE MANAGER
async function updateManager() {
  try {
    const [employees] = await connection
      .promise()
      .query("SELECT * FROM employee");

    const employeeChoices = employees.map(({ id, first_name, last_name }) => ({
      name: `${first_name} ${last_name}`,
      value: id,
    }));

    const { employeeId } = await inquirer.prompt([
      {
        type: "list",
        name: "employeeId",
        message: "Which employee's manager do you want to update?",
        choices: employeeChoices,
      },
    ]);

    const [managers] = await connection
      .promise()
      .query("SELECT * FROM employee WHERE id != ?", [employeeId]);

    const managerChoices = managers.map(({ id, first_name, last_name }) => ({
      name: `${first_name} ${last_name}`,
      value: id,
    }));

    const { managerId } = await inquirer.prompt([
      {
        type: "list",
        name: "managerId",
        message: "Who is the employee's new manager?",
        choices: managerChoices,
      },
    ]);

    await connection
      .promise()
      .query("UPDATE employee SET manager_id = ? WHERE id = ?", [
        managerId,
        employeeId,
      ]);

    console.log("Manager updated successfully!");

    afterConnection();
  } catch (err) {
    console.log(err);
    afterConnection();
  }
}

// function to view employee by department
async function employeeDepartment() {
  try {
    console.log("Showing employees by department...\n");
    const sql = `SELECT employee.first_name, 
                          employee.last_name, 
                          department.name AS department
                   FROM employee 
                   LEFT JOIN role ON employee.role_id = role.id 
                   LEFT JOIN department ON role.department_id = department.id`;
    const [rows] = await connection.promise().query(sql);
    console.table(rows);
    promptUser();
  } catch (err) {
    console.log(err);
    promptUser();
  }
}

// function to delete department
async function deleteDepartment() {
  try {
    const [departments] = await connection
      .promise()
      .query("SELECT * FROM department");

    const departmentChoices = departments.map(({ id, name }) => ({
      name,
      value: id,
    }));

    const { departmentId } = await inquirer.prompt([
      {
        type: "list",
        name: "departmentId",
        message: "Which department would you like to delete?",
        choices: departmentChoices,
      },
    ]);

    await connection
      .promise()
      .query("DELETE FROM department WHERE id = ?", [departmentId]);

    console.log("Department deleted successfully!");

    afterConnection();
  } catch (err) {
    console.log(err);
    afterConnection();
  }
}

// DELETE EMPLOYEES
async function deleteEmployee() {
  try {
    const [employees] = await connection
      .promise()
      .query("SELECT * FROM employee");

    const employeeChoices = employees.map(({ id, first_name, last_name }) => ({
      name: `${first_name} ${last_name}`,
      value: id,
    }));

    const { employeeId } = await inquirer.prompt([
      {
        type: "list",
        name: "employeeId",
        message: "Which employee would you like to delete?",
        choices: employeeChoices,
      },
    ]);

    await connection
      .promise()
      .query("DELETE FROM employee WHERE id = ?", [employeeId]);

    console.log("Employee deleted successfully!");

    afterConnection();
  } catch (err) {
    console.log(err);
    afterConnection();
  }
}

// DELETE ROLE
async function deleteRole() {
  try {
    const [roles] = await connection.promise().query("SELECT * FROM role");

    const roleChoices = roles.map(({ id, title }) => ({
      name: title,
      value: id,
    }));

    const { roleId } = await inquirer.prompt([
      {
        type: "list",
        name: "roleId",
        message: "Which role would you like to delete?",
        choices: roleChoices,
      },
    ]);

    await connection.promise().query("DELETE FROM role WHERE id = ?", [roleId]);

    console.log("Role deleted successfully!");

    afterConnection();
  } catch (err) {
    console.log(err);
    afterConnection();
  }
}
