# Stage 00b — Mount TrueNAS NFS Share on Dev-Web

Mount the TrueNAS sc-development share on Dev-Web via NFS. All commands run over SSH from this Mac.

## Context
- TrueNAS host: read TRUENAS_HOST from .env
- Share name: read TRUENAS_SHARE from .env
- Dev-Web SSH: read DEVWEB_HOST and DEVWEB_USER from .env
- SSH is always via MNG-LAN — never SRV-LAN
- Target mount point on Dev-Web: /mnt/sc-development

## Pre-flight

1. Read .env. If TRUENAS_HOST, TRUENAS_SHARE, DEVWEB_HOST, or DEVWEB_USER are missing or empty, stop and report which variables are missing. Do not proceed.

2. Verify SSH connectivity:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "echo ok"
   If this fails, stop and report the error.

## Steps

3. Discover the NFS export path on TrueNAS:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "showmount -e $TRUENAS_HOST"
   If showmount is not installed:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "sudo apt-get install -y nfs-common && showmount -e $TRUENAS_HOST"
   Identify the export matching the share name. Record the exact export path.
   If no matching export is found, stop and report — TrueNAS NFS export may not be configured.

4. Install nfs-common if not already present:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "dpkg -l nfs-common | grep -q '^ii' || sudo apt-get install -y nfs-common"

5. Create the mount point:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "sudo mkdir -p /mnt/sc-development"

6. Check /etc/fstab for an existing entry for this TrueNAS host + sc-development. If one exists, report it and stop — do not add a duplicate.

7. Add the NFS mount to /etc/fstab using the export path from step 3. Use actual resolved values:
   [kkh01vdweb01] echo "$TRUENAS_HOST:<export_path> /mnt/sc-development nfs rw,auto,nofail,_netdev 0 0" | ssh $DEVWEB_USER@$DEVWEB_HOST "sudo tee -a /etc/fstab"

8. Mount without rebooting:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "sudo mount /mnt/sc-development"

9. Verify mount is active and data is accessible:
   [kkh01vdweb01] ssh $DEVWEB_USER@$DEVWEB_HOST "mount | grep sc-development && ls /mnt/sc-development | head -20"
   Report what ls returns — should show project directories from the rsync.

## Done
Report: NFS export path found, fstab entry added, mount verified active, first 20 entries in /mnt/sc-development.
