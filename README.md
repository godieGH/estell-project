# Estell Social Media App

> A social media app project... built with `express.js` => `(backend/)` and `vue.js` => `(client/)` ~ the vue uses 'quasar framework wrapper for broarder pre-build tools, icons, UI components and etc.

> The project is still on development, everyone is allowed to contribute,
welcome...
We welcome all contributors to add features, fix bugs, enhance, and work on uncomplete issues

Note: for best practice create a features or a fix branch ... and do a PR (pull requests) to request a merge to the main branch; that's will handle development and deployment chaos

## instructions to setup the project
> You will need to clone this repo to your local machine to start your development journey

### Requirements
> To setup your local environment so as to match this project requires:-

* Basic
   1. Node installed in your machine (`Node LTS` reccomendend)
   2. `Mysql` Database ( In here we basically need & use Mysql DB for its perfomance & ease)
   3. `ffmpeg` installed in your machine ( You' need this because the app need it for processing media post files)
     
      > make sure you note the `ffmpeg` & `ffprobe` path incase the program doesn't find em

  4. `git`, make sure you have git for handling version control and pulling and pushing to this repo
  5. Code Editor, `Vs Code` prefered and reccomendend, but you can use any
* Others
   1. `nodemon` a tool (npm package) to serve your `express` (backend/) with a server restart on file change, run 
      ``` bash 
          npm i -g nodemon 
         # to install globally
      ```
   2. `eslint`, npm cli tool for linting... not that compursory but best practise to lint on your dev journey, run
      ``` bash 
          npm i -g eslint
         # to install globally
      ```
         Note: eslint is only for express environment, the vue environment has its built in error and linting mechanism, worry out

   3. You might also include `Docker(VMs)`, `redis(for caching)`, `python(for ML models, algorithms etc.)`, and more such tools and languages we might use later as app grows
      
      
### Step to start the dev.
1. copy the repo `ssh` or `htpp` URL
2. Open Your terminal in your machine, navigate to a directory you want to clone the project to, then run this command
   ``` bash
      git clone git@github.com:godieGH/estell-project.git
   ```
      > This will clone (download) this whole repo to your machine, ensure you have all the required environment setups as mentioned above


   * After cloning you will see a new Dir `estell-project` created... navigate into it, and find these two directories `backend/` and `client/`, these are your project work-around for the full stack development,
   
   * There is alot of files and directories and sub-directories are in each of these two directories, structured just as normal express.js and vue.js projects you have to take sometime to work through and understand the whole file structure
   
   * But don't worry you don't have to know all of those files just know the basics..., You can pass through express, vue + quasar framework docs if You want to understand, it will be worth something but it is not that compursory
  
* Then, navigate to `backend/` and run
   ``` bash
      npm install
      # to install all the dependency at backend-level
   ```
   * After there you'll have to start a Mysql server, and ensure it has a database named `estell-app-db` - create one, it has to run on port: `3306`; always a default for Mysql
   
   * Please open a file ./backend/.env and edit these db environment & config values like, db hostname, username, password(use your db password), db-name(`estell-app-db`) etc.; this will be your databse setups
   
   * Best practise find a good or what-so-ever-you-like Mysql client or DB management tool to configure your machine databse and run the server
  
   * In the ./backend/.env file there is lines
   ``` bash
      FFMPEG_PATH=/path/to/files/usr/bin/ffmpeg
      FFPROBE_PATH=/path/to/files/usr/bin/ffprobe
      # ensure you tell the program where to find the ffmpeg and ffprobe if in any case it can't find em automatically, it knows where you define them here
      # You will know the path by finding where you machine install bin or command line tools, it can be something like root/usr/bin it depends on devices
   ```
  * Then You can just leave other fields in the .env file as they are or if you want to change them like the secrete keys you are open to
  * 
  * Now you can start the backend server so far to see if is running, run
  ``` bash
      #run this in backend/
      npm start # if you have nodemon installed 
      #or
      npm run dev # if you don't want to watch on file changes
  ```
   * If you encounter errors on run, that means there is somrthing missing on the Requirements, trace and try to fix each, You might want to repeat the processes above
   * The backend server should be running on `port: 3000` by default if you didn't the base port and base url by in the .env file
   
3. setup the client app, navigate to `client/` and run
   ``` bash
      npm install # to install all client dependencies
   ```
  * You might want to do other config, the client uses quasar framework, so the project config is in the quasar.config.js
  * 
  * You might also want to install some cli tools globally, apart from `nodemon` and `eslint` for backend, you can install `quasar cli`, `cordova` or `capacitor` (if you will later want to build into native mobile apps)
  * Now so far so good You can start the client server, It is an HMR
  * run these commands
   ``` bash
      quasar dev # to start a simple quasar dev server with default mode SPA (single page Application)
      # or
      npm start
   ```
   ``` bash
      quasar dev -m[ pwa | spa | ssr # to start in one different mode can be pwa, spa(default), srr( though not developed and configured well yet)
   ```
   ``` bash
      quasar build # to build the app, spa default mode
      #or 
      quasar build -m[ pwa | spa | ssr #to build in these mode
   ```
   Note: The new made built files are then in `client/dist/`
      
> You can serve them with a static file server `quasar serve`, or `nginx`
> But we reccomend, you to copy the `dist/pwa/*` or `dist/spa/*` or what ever you built mode was to, `backend/public/` and start a `backend/` server to server them in `public/public/`
                  
``` bash 
   npm start  #run in the backend/ this will serve the public and express app at same URL 
```
   
> If You ran a dev command then you have to use:-
         
``` bash
   http://localhost:8080/ 
   #for the client just access this in the browser, to see the app UI
```
> and 

``` bash
   http://localhost:3000/ #this is where your backend/ Is running by default and all client/ api calls are proxied to 
   # If you ran build commands and copied the dist/*/* content to the backend/public/ then you can access the app UI with this too, no proxies, api calls are called with in-self path `/`
```

 > Run

``` bash
   quasar clean # To clean built dist, caches and temp files
```

* With those above that's what you have to run this project in your machine, don't worry about databses table the `express backend` is designed with help or `sequelize` ORM to automatically create the tables just ensure you have `Mysql` running and a db with the name as said above
* Unfortunately, we don't use sequelize migrations and seeders I hope someone should add this feature too so we could ensure nicer and well databses handles and seeding for better development experience, we can use `sequelize cli`
* The models are well defined, best practise, you should pass through to study them and understand them

Note: Please before jumping into development phase make sure, You pass and understand the structure of this whole project to avoid unnecessary prone-to-errors


### Starting the dev processes
> You must want to add a feature, fix a bug, correct some thing or even want to try sometime new, then this is your part
  
  #### Steps to start dev
  1. first run `git pull origin` to ensure you project is up-to-date with the one in the repo, 
  2. Then run `git branch` to see if you are on the `main` branch 
  3. Create a branch for your feature, bug fix or what ever you wish to, run `git checkout -b feature/feature-name-here` the best practise to write branch names:-
      * eg. feature/user-authentication, bugfix/backend-login-logic, docs/UI-usage-docs, refactor/optimise-db-table-migrations
      * Use something standard that others can understand 
  4. Now since you are in your branch, run `git branch` again to see the active branch it should be what you created
  5. You can now edit, create modify files and what ever you want here and run `git add <file>` to stage these files and commit them rigt away, best practise to frequently stage and commit to keep track of what you are working through
  6. `git push`, you can push yout branch to the repo for more next steps like PRs, approval and merge to the main, run `git push -u origin <branch-name>` This will push your branch to the repo
  7. For PRs you can come in this repo, and create one and wait for others to approve your feature / bugfix or whatever you was developing

Note: We use `git pull origin main` to pull  and ensure the main is up-to-date, and run `git merge main` in our new created branches to merge and see if our new codes we are working on are not in conflict with new main codes, Please don't `git rebase` it is not recommended

Note also: before you create new feature that is not in the issue board on this repo, raise an issue assing yourself on if that issue is listed and someone else is assigned yoh should jump to another issues or just dev and see whose modifications can be worth it , this is a best practise to ensure everyone knows what they are working on

> Please if someone wants to edit this readme and add something that others might understand and work well with our project, you are welcome,

By: - godieGH

  
