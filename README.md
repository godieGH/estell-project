# Estell Social Media App

> A social media app project... built with `express.js` => `(backend/)` and `vue.js` => `(client/)` ~ the vue uses 'quasar framework wrapper for broarder pre-build tools, icons, UI components and etc.

> The project is still on development, everyone is allowed to contribute,
> welcome...
> We welcome all contributors to add features, fix bugs, enhance, and work on uncomplete issues

Note: for best practice create a features or a fix branch ... and do a PR (pull requests) to request a merge to the main branch; that's will handle development and deployment chaos

## instructions to setup the project

> You will need to clone this repo to your local machine to start your development journey

### Requirements

> To setup your local environment so as to match this project requires:-

- Basic

  1.  Node installed in your machine (`Node LTS` reccomendend)
  2.  `Mysql` Database ( In here we basically need & use Mysql DB for its perfomance & ease)
  3.  `ffmpeg` installed in your machine ( You' need this because the app need it for processing media post files)

      > make sure you note the `ffmpeg` & `ffprobe` path incase the program doesn't find em

  4.  `git`, make sure you have git for handling version control and pulling and pushing to this repo
  5.  Code Editor, `Vs Code` prefered and reccomendend, but you can use any

- Others

  1.  `nodemon` a tool (npm package) to serve your `express` (backend/) with a server restart on file change, run
      ```bash
          npm i -g nodemon
         # to install globally
      ```
  2.  `eslint`, npm cli tool for linting... not that compursory but best practise to lint on your dev journey, run

      ```bash
          npm i -g eslint
         # to install globally
      ```

      Note: eslint is only for express environment, the vue environment has its built in error and linting mechanism, worry out

  3.  You might also include `Docker(VMs)`, `redis(for caching)`, `python(for ML models, algorithms etc.)`, and more such tools and languages we might use later as app grows

### Step to start the dev.

1. copy the repo `ssh` or `htpp` URL
2. Open Your terminal in your machine, navigate to a directory you want to clone the project to, then run this command

   ```bash
      git clone git@github.com:godieGH/estell-project.git
   ```

   > This will clone (download) this whole repo to your machine, ensure you have all the required environment setups as mentioned above

   - After cloning you will see a new Dir `estell-project` created... navigate into it, and find these two directories `backend/` and `client/`, these are your project work-around for the full stack development,
   - There is alot of files and directories and sub-directories are in each of these two directories, structured just as normal express.js and vue.js projects you have to take sometime to work through and understand the whole file structure
   - But don't worry you don't have to know all of those files just know the basics..., You can pass through express, vue + quasar framework docs if You want to understand, it will be worth something but it is not that compursory

- Then, navigate to `backend/` and run

  ```bash
     npm install
     # to install all the dependency at backend-level
  ```

  - After there you'll have to start a Mysql server, and ensure it has a database named `estell-app-db` - create one, it has to run on port: `3306`; always a default for Mysql
  - Please open a file ./backend/.env and edit these db environment & config values like, db hostname, username, password(use your db password), db-name(`estell-app-db`) etc.; this will be your databse setups
  - Best practise find a good or what-so-ever-you-like Mysql client or DB management tool to configure your machine databse and run the server
  - Set your environment variables in both client and backend, there is these files called .env.template they provide template for you to create new .env files for your project environment variables
  - create .env file for each, set db environment variables, secrets and paths, some other default values are pre-set within .env.template
  - In the ./backend/.env file there should be a line

  ```bash
     FFMPEG_PATH=/path/to/files/usr/bin/ffmpeg
     FFPROBE_PATH=/path/to/files/usr/bin/ffprobe
     # ensure you tell the program where to find the ffmpeg and ffprobe if in any case it can't find em automatically, it knows where you define them here
     # You will know the path by finding where you machine install bin or command line tools, it can be something like root/usr/bin it depends on devices
  ```

  - Then You can just leave other fields in the .env file as they are or if you want to change them like the secrete keys you are open to
  -
  - Now you can start the backend server so far to see if is running, run

  ```bash
      #run this in backend/
      npm start # if you have nodemon installed
      #or
      npm run dev # if you don't want to watch on file changes
  ```

  - If you encounter errors on run, that means there is somrthing missing on the Requirements, trace and try to fix each, You might want to repeat the processes above
  - The backend server should be running on `port: 3000` by default if you didn't the base port and base url by in the .env file

3. setup the client app, navigate to `client/` and run
   ```bash
      npm install # to install all client dependencies
   ```

- You might want to do other config, the client uses quasar framework, so the project config is in the quasar.config.js
-
- You might also want to install some cli tools globally, apart from `nodemon` and `eslint` for backend, you can install `quasar cli`, `cordova` or `capacitor` (if you will later want to build into native mobile apps)
- Now so far so good You can start the client server, It is an HMR
- run these commands

```bash
   quasar dev # to start a simple quasar dev server with default mode SPA (single page Application)
   # or
   npm start
```

```bash
   quasar dev -m[ pwa | spa | ssr # to start in one different mode can be pwa, spa(default), srr( though not developed and configured well yet)
```

```bash
   quasar build # to build the app, spa default mode
   #or
   quasar build -m[ pwa | spa | ssr #to build in these mode
```

Note: The new made built files are then in `client/dist/`

> You can serve them with a static file server `quasar serve`, or `nginx`
> But we reccomend, you to copy the `dist/pwa/*` or `dist/spa/*` or whatever you built mode was, to `backend/public/` and start a `backend/` server to serve them in the `backend/public/`

```bash
   npm start  #run in the backend/ this will serve the public and express app at same URL
```

> If You ran a dev command then you have to use:-

```bash
   http://localhost:8080/
   #for the client just access this in the browser, to see the app UI
```

> and

```bash
   http://localhost:3000/ #this is where your backend/ Is running by default and all client/ api calls are proxied to
   # If you ran build commands and copied the dist/*/* content to the backend/public/ then you can access the app UI with this too, no proxies, api calls are called with in-self path `/`
```

> Run

```bash
   quasar clean # To clean built dist, caches and temp files
```

- With those above that's what you have to run this project in your machine, don't worry about databses table the `express backend` is designed with help or `sequelize` ORM to automatically create the tables just ensure you have `Mysql` running and a db with the name as mentioned above
- Unfortunately, we don't use sequelize migrations and seeders, I hope someone should add this feature too, so we could ensure nicer and well databses handlings and seeding for better development experience, we can use `sequelize cli`
- The models are well defined, best practise; You should and must pass throughout the project and study them, understanding the structure, schema, bussness logics, routing both client and backend, Api calls, sequelize, socket.io, user-authentication and authorization,
- You can create an account in the app to see If You were a user, how would you feel the experience

Note: Please before jumping into development phase make sure, You pass and understand the structure of this whole project to avoid unnecessary prone-to-errors

### Starting the dev processes

> You must want to add some features, fix a bug, correct and refactor somethings/features or even want to try somethings new, then this is your part

#### Steps to start dev

1. first run `git pull origin` to ensure you project is up-to-date with the one in the repo,
2. Then run `git branch` to see if you are on the `main` branch
3. Create a branch for your feature, bug fix, refactor or whatever you wish to, run `git checkout -b feature/feature-name-here` the best practise to write branch names:-
   - eg. feature/user-authentication, bugfix/backend-login-logic, docs/UI-usage-docs, refactor/optimise-db-table-migrations
   - Use something standard that others can understand
4. Now since you are in your branch, run `git branch` again to see the active branch it should be what you created
5. You can now edit, create modify files and whatever you want up here and just run `git add <file>` to stage your changes and commit them rigt away, best practise is to frequently stage and commit to keep track of what you are working on, avoid long term commits and ensure commits ain't so undescreptive and none-impact one
6. `git push`, you can push your branch to the repo for more next steps like PRs, approval and merge to the main, run `git push -u origin <branch-name>` This will push your branch to the repo
7. For PRs you can come in this repo, and create one and wait for others to approve your feature / bugfix, refactor or whatever you was developing

Note: We use `git pull origin main` to pull and ensure the main is up-to-date, and run `git merge main` in our new created branches to merge and see if our new codes, what we are working on are not in conflict with new main codes (merge conflicts), Please don't `git rebase` it is not recommended,

> Just run `git pull main` and `git merge main` (to merge the main with your branch) frequently before edit, push, or else to ensure you code is up-to-date and no merge comflict

Note also: before you create new feature that is not in the issue board on this repo, raise an issue assign yourself on it, if that issue is listed and someone else is assigned you should jump to another issues or just develop and see whose modifications can be worth it , this is a best practise to ensure everyone knows what they are working on, Just know that someone else might be working on that feature or bug fix too

### Some other things to know

> You might want to run this project concurrently at the root dir, it is a monorepo but independently on dependencies (I mean you have to run `npm install` to both client/ and backend/ even though some packages might be similar to both), I think, We might later try to implement the `npm workspaces` to handle dependencies and packages that both part (client/ and backend/) need, This is an issue and anybody can try to add this feature too

run

```bash
   npm install #at root to install concurrently— a pkg that allows you to run different projects concurrently
```

Then, you can use (at the project root)

```bash

npm run dev # to run both backend and client at the same time
#or
npm run start-backend #to start just the backend
#or
npm run start-client #to start just the backend
#or
npm run build-client #To build a simple SPA mode client app, to build different or other modes you need to implement quasar-cli commands, which can not be ran at root go down to client/ for that
#or
npm run install-backend #to install backend dependencies
#or
npm run install-client #to install client dependencies
#or
npm run install-all #to install dependencies in both of them at once
```

- While I was developing at the client I encountered a problem specifically it might be my machine; but during build under PWA mode, if I allowed minification by `terser` (a tool that quasar uses for minification) to `true` in the `quasar.config.js` then esbuild and the build process would fail/crash saying there is an existing huge file (more than 5Mbs or something).. then I would disable minification or run `quasar build -m pwa --debug` (Which also skips minification) to achieve build process
- It might work on your machine, so just go in the file `client/quasar.config.js` and look for a block similar:-

```js
   build: {
      //other build configs

      minify: false, //comment it out or just write `minify: true,` to allow minification on build

      //other build configs
   }
```

#### migrations & seeders

> They help us to manipulate db schema (create/drop table, add, alter, modify constraints of table columns), seeders help us to feed data into this table more effeciently and helpfull during dev and even on test and production.
> This project is configured to use migrations and seeders, think of them as version control of your databses, in here you don't have to create tables manually just follow the steps below

navigate to root and run

```bash
npm run db:migrate #this will create all the tables and match your db with current project schema
```

then run

```bash
npm run db:seed #to seed the user table with user pre-defined data for a start
```

- You might need to `cd backend/` to run other `sequelize cli` commands to create `migrations` and `seeder` files. ensure the `backend/config/config.js` file is available because running `sequelize cli` command in `backend/` needs it

Note: During, development, developers are required to mandentory utilize model + migrations + seeder to interact and manipulate databses, this is compursory for this version of Application to ensure all team members(all developers) have the same db state and version controll

run these commands in backend/

```bash
npx sequelize-cli migration:generate --name "descreptive-name-of-migrations"
```

Then go and edit the created migration skeleton file, define your changes(table, column, attributes etc), and ensure the schema defined matches the model - that means the output table is mapped by the responsible Model to interact well with it

run

```bash
npx sequelize-cli db:migrate #to excute unsolved migrations
```

run

```bash
npx sequelize-cli seed:generate #to generate a new seeder files
```

and run

```bash
npx sequelize-cli db:seed:all #to apply changes to new unexcutable seeders
```

- Don't worry about version control of both seeders and migrations file just, don't edit ran existing migrations and seeders, for new changes just create new migrations or new seeders files

> _Please if someone wants to edit this readme and add something that others might understand and work well with our project, you are humbely welcome_
