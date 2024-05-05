# Excel-Merch-Backend

### Documentation

https://documenter.getpostman.com/view/29362600/2s9YkrZeL2


### Order Status Flow
![orderStatusFlow](assets/Order%20Status.png)

### Some stuff to note
- The storage bucket must have its cors configured, the backend does this on startup
- GCP Service Accounts was made with "Storage Admin" permission. The service account needs permission to:
    - Create, read, update, delete files and folders in storage and set object metadata
    - Update bucket cors policy on startup