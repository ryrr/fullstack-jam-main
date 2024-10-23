# Harmonic JAM overview
## Design choices 
- ### backend
- Moving a couple Ids isn't terribly intensive on our DB so that was pretty easy
- MoveAll is acomplished through splitting our input ids into chunks and processing each chunk as a separate task
- I used `BackgroundTasks` from `FastAPI` along with `semaphore` from `asyncio` to create a list of running tasks with a limit as to how many could be running at once 
- Along with this I used the `run_in_threadpool` method from `fastapi.concurrency` to set these chunked tasks to run in the background and not block the event loop.
- I also set up an endpoint to stream data back to our client to let the client know the status of their job, I implemented this using a `StreamingResponse` to provide light weight SSE (Server Sent Events)
- Related to this I set up a very simple in-memory store to keep track of the jobs that are currently running, it's just a python dict that uses the jobId to key values that tell us how many chunks remain to be processed 
- I also implemented a cache using `redis` that can cache/retreive companies if the DB is super slow (ended up being overkill)
- ### Frontend
- Set up a simple debounce on the `useEffect` that provides our grid with companies to render, stopping a lot of extra clogging requests when a user scrolls many pages at once
- Added a Widget to allow users to move items between lists, uses `select` elements and the currently selected collection to determine an action to take 
- Added a Job progress bar and a completed state 
- Got our `CompanyTable` behaving correctly, it now keeps selected elements local to the collection you're toggled onto. 
- Initially had a loading state durring company pagination but I felt like it was jarring and I preferred the slight delay
# Assumptions
- I feel like just using a job queue library like `celery` was the obvious way to do this if you want your solution to scale across many users and make it to production 
- However I think my solution is better suited for the task given as it's more lightweight and dosen't introduce a ton of unneccesary features and overhead, plus it was fun to figure it out without using a big library
- I also didn't go too in depth with the styling, would've been fun to do more with it. Kept it simple for the sake of time, I think the UI is decent enough
- I also don't think a flawless experience is possible with a handicapped DB like this one, I think it works pretty well but obviously the responses are not totally instant. 
- I also assumed we wanted NO DUPLICTATES in the system, the specs didn't say anything about it. Nor did it say anything about REMOVAL, so I assumed we just wanted to add from list to list and not remove anything 
- I assume we couldn't just remove the Jamming FN from main.py (ha ha)
# Next Time
- Would've liked to work on the UI more (Adding a ton of Jobs ends up wonky on the UI, and the Widget just looks OK)
- Would've been cool to learn Celery or some other job queue framework 
- Obviously would like to optimize as much as possible and find a better way to implement Redis
- Would like to write unit tests 
- Actual perfomance testing and metrics system, figuring out mathmaticially how to eek out the best possible performance 
- Make the backend code organization a little better, I ended up leaving a bunch of helper FNs and unneccessary stuff inside companies.py
- One thing I just realized is I should've been setting the Grid Pages Count using the readout from my SSE endpoint, currently It updates the count when a page is turned 

[LOOM VIDEO LINK](https://www.loom.com/share/1d6e3c6599db4f3f9a87f44180fdaf80?sid=d109c388-93d3-4bbf-a146-f231b52745a4)