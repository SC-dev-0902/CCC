# Stage 00a — Mount TrueNAS SMB Share on Mac

You are setting up a permanent SMB mount on this Mac for the TrueNAS share that will host all SC-Development project files.

## Context
- TrueNAS host: read TRUENAS_HOST from .env
- Share name: read TRUENAS_SHARE from .env
- Mount point: read TRUENAS_MOUNT from .env
- Credentials: read TRUENAS_SMB_USER and TRUENAS_SMB_PASS from .env

## Steps

1. Read .env and extract TRUENAS_HOST, TRUENAS_SHARE, TRUENAS_MOUNT, TRUENAS_SMB_USER, TRUENAS_SMB_PASS. If any are missing or empty, stop and report the missing variable — do not proceed.

2. Create the mount point directory:
   sudo mkdir -p $TRUENAS_MOUNT

3. Store the SMB credentials in the macOS Keychain so /etc/fstab can use them without embedding the password in plaintext:
   security add-internet-password -s $TRUENAS_HOST -a $TRUENAS_SMB_USER -w $TRUENAS_SMB_PASS

4. Check /etc/fstab for an existing entry for this host and share. If one exists, report it and stop — do not add a duplicate.

5. Append the following line to /etc/fstab (requires sudo). Use the actual resolved values, not the variable names:
   //$TRUENAS_SMB_USER@$TRUENAS_HOST/$TRUENAS_SHARE $TRUENAS_MOUNT smbfs rw,auto,nobrowse 0 0

6. Mount the share now without rebooting:
   sudo mount -t smbfs //$TRUENAS_SMB_USER@$TRUENAS_HOST/$TRUENAS_SHARE $TRUENAS_MOUNT

7. Verify the mount is active:
   mount | grep $TRUENAS_SHARE
   ls $TRUENAS_MOUNT
   The share is currently empty — ls must not error.

## Done
Report: mount point created, Keychain entry stored, fstab entry added, mount verified active.
Tell Phet: share is mounted. You can now run the rsync command.
