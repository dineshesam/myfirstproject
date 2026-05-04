/* CAPGEMINI_PROLOG_BEGIN_TAG
*
* ©Copyright 2017-2025 Capgemini Engineering ACT S.A.S.. All rights reserved.
* CAPGEMINI_PROLOG_END_TAG
*/
import { AppSwitcher } from '@maximo/maximo-js-api';
import { log, RESTDataAdapter, Datasource } from '@maximo/maximo-js-api';
import 'regenerator-runtime/runtime';
import { } from './style.css';
import approvaldeniedimage from "./common/img/ic_approval_denied.svg"
import approvedimage from "./common/img/ic_approved.svg"
import commentbyuserimage from "./common/img/ic_comment_by_user.svg"
import commentsimage from "./common/img/ic_comments.svg"
import emailimage from "./common/img/ic_email.svg"
import requestcreatedimage from "./common/img/ic_request_created.svg"
import statuschagnedimage from "./common/img/StatusChangedIcon.svg"
import ticketcreatedimage from "./common/img/ic_ticket_created.svg"
import chattranscripticon from "./common/img/chattranscript32.svg"
import transferticket from "./common/img/transferticket32.svg"
import checkCircleSuccess from "./common/img/check-circle-success.svg"
import checkCircleDanger from "./common/img/check-circle-danger.svg"
import moment from 'moment-timezone';
import CommonUtil from './util/CommonUtil';
import { async } from 'regenerator-runtime';

const TAG = 'TicketDetailController';

class TicketDetailController {

    disableCommLog = 0;
    hostInfo = window.location.protocol + "//" + window.location.host;
    /**
     * Called automatically during the Page initialization lifecyle.
     *
     * @param {page} page - Page instance to which the controller is bound.
     * @param {Application} app - Application instance.
     */

    applicationInitialized(app) {

        this.app = app;

        this.app.state.isback = false;

    }
    pageInitialized(page, app) {
        log.t(TAG, 'Page Initialized');

        this.app = app;
        this.page = page;
        this.page.state.addCommentstate = "";
        this.page.state.selectedOwnedBy = {};
        this.page.state.isTextEmpty = true;
        this.page.state.objarr = [];
        this.page.state.modifiedactivity = []
        this.page.state.ifpageresumed = false;
        this.page.state.ticketdetails = ""
        this.page.state.isTextEmpty = true
        this.page.state.isUpdateTextEmpty = true
        this.page.state.isCancelTextEmpty = true
        this.page.state.isConfirmTextEmpty = true
        this.page.state.typeofissue = ""
        this.page.state.modalDialogData = {}
        this.page.state.confirmValue = 0;
        this.page.state.hideOwnedBy = false;
        this.page.state.isLoadFirst = true;
        this.app.state.pageLoading = true;
        this.page.state.selectedTabIndex = 0;
        this.loadJsonDS();
        this.page.state.pagechange = false;
        this.page.state.pagechangenew = true;
        if (this.app.state.aiEnable) {
            this.getSimilarIncidentData();
        }
    }

    async confirmowership(item) {

        this.app.showDialog('confirmowership');
    }

    resetResolveData() {
        this.page.state.confirmValue = 0;
    }
    changeConfirmationValue(eve) {
        console.log("Event ", eve);
        if (eve == 'Yes') {
            this.page.state.confirmValue = 0;
        }
        else {
            this.page.state.confirmValue = -1;
        }
    }

    pageResumed(page) {
        this.page.state.selectedTabIndex = 0;
        if (!this.page.state.isLoadFirst) {
            this.app.state.pageLoading = true;
            this.loadJsonDS();
            if (this.app.state.aiEnable) {
                this.getSimilarIncidentData();
            }
        }
        this.hideOwnedBy();
    }

    pagePaused(Page, Application) {
        this.page.state.isLoadFirst = false;
        this.page.state.togglevalue = null;
        this.page.state.selectedRelatetoGlobal = {};
        this.resetData();
    }

    resetData() {
        let dataSourceArr = [{ name: 'modifiedactivitylogs' }, { name: 'wodetailsDS' }, { name: 'relatedRecordDS' }, { name: 'activityLogDS' }, { name: 'globalIncidentDS' }, 
         {name:'similarIncidentDS'}, {name: 'possibleSolutionDS'},{name: 'dismissedIncidentDS'}];
        let self = this;
        // reset the datasource
        dataSourceArr.forEach(async (item) => {
            let obj = self.app.findDatasource(item.name);
            obj.resetState();
            obj.clearState();
            obj.load({ src: [], noCache: true });
        })
    }

    getStatusDescription(class_maxvalue, status) {

        switch (class_maxvalue) {
            case "PROBLEM":
                this.page.state.dynamic_des = this.app.state.problem_status_local[status].description;
                break;
            case "INCIDENT":
                this.page.state.dynamic_des = this.app.state.incident_status_local[status].description;
                break;
            case "SR":
            default:
                this.page.state.dynamic_des = this.app.state.ticketstatus_local[status].description;
                break;

        }
    }

    AddComment(args) {
        let dsaddcomment = this.page.findDatasource("wodetailsDS");
        let self1 = this;
        if (this.page.state.addCommentstate.replace(/\s+/g, "").length == 0) {
            this.page.state.isTextEmpty = false
        } else {
            // Author: Dinesh Agrahari, Date: 20-10-2025, Defect:135670, Reason: MIT 9.1 | 2-June | Service Delivery | Add comment accepting HTML code.
            // if Comment is not empty, validate content.
            const commentText = this.page.state.addCommentstate;
            // check: HTML tags, links OR special characters.
            const htmlOrLinkPattern = /<[^>]*>|https?:\/\/\S+/i;
            const specialCharPattern = /[<>@#$%^&*{}[\]|\\]/;
            const encodedHtmlRegex = /(&lt;|&gt;|&#60;|&#62;)/i;

            if (htmlOrLinkPattern.test(commentText) || specialCharPattern.test(commentText) || encodedHtmlRegex.test(commentText)) {
                this.app.toast(this.app.getLocalizedLabel('error_html_not_allowed','Comments should not contain HTML, links, or symbols'),'error',null,null,false);
                return;
            }

            let ds = this.page.findDatasource("worklog1");
            ds.state.canSave = true;
            dsaddcomment.getItems().forEach(async (item) => {
                let newSR = {
                    class: await CommonUtil.getTKClass(self1.app, item.class_maxvalue),
                    clientviewable: true,
                    description: self1.page.state.addCommentstate.substring(0, 97) + "...",
                    description_longdescription: self1.page.state.addCommentstate,
                    logtype: "CLIENTNOTE",
                    recordkey: item.ticketid,
                    id: item.ticketuid
                };
                let result = await ds.add(newSR, {
                    objectStructure: 'CDUIMYWORKLOG',
                    responseProperties: 'description,ticketid'
                })
                if (result) {
                    let saveresult = await ds.save();
                    if (saveresult && saveresult.error) {
                        let label = self1.app.getLocalizedLabel('dashboard_add_tk__msg_failed', 'Add comment failed');
                        self1.app.toast(label, 'error', null, null, false);
                    } else {
                        let label = self1.app.getLocalizedLabel('dashboard_add_tk__msg_success', 'Comment added successfully');
                        self1.app.toast(label, 'success', null, null, false);

                        // refersh the my ticket data.      
                        this.loadJsonDS();
                        self1.page.findDialog('add_Comments1').closeDialog();
                        self1.page.state.addCommentstate = ""
                    }
                }
            })


        }

    }

    resetCommentForm() {
        this.page.state.addCommentstate = '';
    }


    async showConfirmationDialog() {
        let seletedStatus = this.page.state.statusList.filter((el) => {
            return el.value === this.page.state.selectedStatus;
        })[0].description;
        if (seletedStatus.toUpperCase() === this.app.state.ticketstatus.CLOSED.toUpperCase()) {
            this.app.showDialog('closed_ticket_dialognew');
        }
        //  if(this.page.state.selectedStatus === "QUEUED"){
        else {
            //  alert("hello");
            this.changeStatusMyTickets();
        }
    }

    // click event for the change status
    async changeStatusMyTickets() {
        console.log('dialogstate12', this.page.state.dialogstate);
        // checking no status change
        if (this.page.state.dialogstate === this.page.state.selectedStatus) {
            return;
        }
        this.app.state.pageLoading = true;
        let loggedUser = this.app.userInfo;
        let user = loggedUser.personid;
        // load the dynamic data for changing status
        let formdata = await this.loadnewds();
        formdata.item.status = this.page.state.selectedStatus;
        // Enabling the ds to save the changes 
        formdata.state.canSave = true;
        //  saving the ds
        let saveresult = await formdata.save();
        // defect 134014 Change Status | Getting Error Message along with Successful snack bar after changed status to NEW.
        // checked addtional error parameter in case of error.
        if (saveresult && !saveresult.error && saveresult.items.length > 0) {
            // ticket description  
            let resolutionStatus = this.app.getLocalizedLabel(
                'dashboard_my_ticket_changestatus_msg',
                `Status changed from ${(this.page.state.dialogstate)} to ${(this.page.state.selectedStatus)} by ${(user)}`,
                [this.page.state.dialogstate, this.page.state.initialStatus, user]
            )
            let label = this.app.getLocalizedLabel('dashboard_my_ticket_status_success', 'Status changed successfully');
            this.app.toast(label, 'success', null, null, false);
            // refersh the my ticket data.   
            this.loadJsonDS();
            this.app.state.pageLoading = false;
            this.app.state.hardRefresh = true;
            this.page.findDialog('changeStatusnew').closeDialog();

        } else {
            let label = this.app.getLocalizedLabel('dashboard_my_ticket_status_failed', 'Change status failed')
            this.app.state.pageLoading = false;
            // this.page.findDialog('changeStatus').closeDialog();  
            //  this.page.state.selectedStatus=''; 
            this.app.toast(label, 'error', null, null, false);
            return;
        }
    }

    async changeStatus(wodetail) {
        this.page.state.dialogstate = wodetail.item.status;
        switch (wodetail.item.class_maxvalue) {
            case "INCIDENT":
                this.page.state.statusList = this.app.state.IncidentStatusData;
                break;
            case "PROBLEM":
                this.page.state.statusList = this.app.state.ProblemStatusData;
                break;
            case "SR":
                this.page.state.statusList = this.app.state.srStatusData;
                break;
            default:
                this.page.state.statusList = this.app.state.srStatusData;
                break;
        }
        this.page.state.selectedStatus = wodetail.item.status;
        this.app.showDialog('changeStatusnew');
    }
    //selection for owner/ownergroup
    selectOwner(obj) {
        if (obj.evt._selected) {
            if (obj.name == 'owner') {
                this.page.state.selectedOwnedBy = {
                    name: obj.name,
                    value: obj.evt.personid
                };
                let owner_groupDS1 = this.page.findDatasource('owner_groupDS1');
                owner_groupDS1.resetState();
            } else {
                this.page.state.selectedOwnedBy = {
                    name: obj.name,
                    value: obj.evt.persongroup
                };
                let ownerDS1 = this.page.findDatasource('ownerDS1');
                ownerDS1.resetState();
            }
        }
    }
    // on primary click event to save the selected owner/ownerGroup data
    async onSelectedOnwedBy() {
        let owner_groupDS1 = this.page.findDatasource('owner_groupDS1');
        let ownerDS1 = this.page.findDatasource('ownerDS1');
        // if newly selected person id is the same as previously selected person:- do nothing.
        if (this.app.userInfo.personid === this.page.state.selectedOwnedBy.value) {
            return
        }
        // checking the selected value
        if (this.page.state.selectedOwnedBy.value) {
            this.app.state.pageLoading = true;
            // load the dynamic data
            let formdata = await this.loadnewds();
            // Set the owner/ownerGroup
            this.page.state.preSelectedOwnerType = this.page.state.selectedOwnedBy.name;
            //  checking the selected owner type
            // Defect 134033
            if (this.page.state.preSelectedOwnerType === 'owner') {
                formdata.item.owner = this.page.state.selectedOwnedBy.value;
                formdata.item.ownergroup = '';
            }
            else {
                formdata.item.owner = '';
                formdata.item.ownergroup = this.page.state.selectedOwnedBy.value;
            }
            // Enabling the ds to save the changes 
            formdata.state.canSave = true;
            //  saving the ds
            let saveresult = await formdata.save();
            await owner_groupDS1.resetState();
            await ownerDS1.resetState();
            if (saveresult && saveresult.items.length > 0) {
                // populate the success message on the UI
                let label = this.app.getLocalizedLabel('dashboard_my_ticket_assign_success', 'Incident reassigned successfully');
                this.app.toast(label, 'success', null, null, false);
                this.app.state.hardRefresh = true;
                // refersh the my ticket data.      
                this.loadJsonDS();
            }
            else {
                // populate the failed message on the UI
                let label = this.app.getLocalizedLabel('dashboard_my_ticket_assign_failed', 'Incident reassign failed')
                this.app.toast(label, 'error', null, null, false);
            }
            this.app.state.pageLoading = false;
            this.page.findDialog("assignTonew").closeDialog();
        }
    }

    //  Cancel click event for assign to 
    cancelOwnerPopup() {
        let ownerDS1 = this.page.findDatasource('ownerDS1');
        let owner_groupDS1 = this.page.findDatasource('owner_groupDS1');
        owner_groupDS1.resetState();
        ownerDS1.resetState();
    }

    //begin Defect 136758: MIT 9.1.41 | 27-Nov | Service Delivery | SLA Due at time is not showing as per Figma .
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        var options = { hour: '2-digit', minute: '2-digit', hour12: true };
        let timest = new Date(timestamp.toLocaleString()).toLocaleTimeString('en-US', options);
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');  
        return `${month}/${day}/${year} ${timest}`;
    }
    //end Defect 136758: MIT 9.1.41 | 27-Nov | Service Delivery | SLA Due at time is not showing as per Figma .

    async loadJsonDS() {
        let wodetailsDS = await this.app.findDatasource('wodetailsDS');
        let newSRCds = []
        let newSRdata = {
            query: {
                'oslc.select': '*',
                'oslc.pageSize': '1',
                'oslc.where': 'ticketuid=' + this.page.params.ids,
                savedQuery: 'filter',
                'sqp:classList': this.page.params.class,
                'searchAttributes': '*'
            }
        }

        this.app.client.restclient.get('os/CDUIMYTICKET', newSRdata).then(newres => {
            let newtada = newres.member[0];
            this.getRelatedRecordMyTicket(newtada.relatedrecord);
            this.getStatusDescription(newtada.class_maxvalue, newtada.status)
            this.renderActivityLogData(newtada);
            this.app.state.pageLoading = false;
            let sla_action = "";
            if (newtada.slarecords && newtada.slarecords.length > 0) {
                if (newtada.slarecords[0].slacommitments && newtada.slarecords[0].slacommitments.length > 0) {
                    sla_action = newtada.slarecords[0].slacommitments[0].type
                }
            }
            let cdui_incidentlog = "Unspecified";
            if (newtada.cduiincidentlog && newtada.cduiincidentlog.length > 0) {
                cdui_incidentlog = newtada.cduiincidentlog[0].newvalue;
            }
            // Adding text for global fields
            let isGlobalText;
            if (newtada.isglobal) {
                isGlobalText = this.app.getLocalizedLabel('ticket_detail_is_global_yes', 'Yes');
            } else {
                isGlobalText = this.app.getLocalizedLabel('ticket_detail_is_global_no', 'No');
            }
            //begin Defect 136758: MIT 9.1.41 | 27-Nov | Service Delivery | SLA Due at time is not showing as per Figma .
            if(newtada.targetfinish){
                let t1 =  this.formatTimestamp(newtada.targetfinish);
                newtada.targetfinish = t1;
            }
            //end Defect 136758: MIT 9.1.41 | 27-Nov | Service Delivery | SLA Due at time is not showing as per Figma .
            newSRCds.push({
                ticketid: newtada.ticketid,
                description: newtada.description,
                description_longdescription: newtada.description_longdescription,
                internalpriority_description: newtada.internalpriority_description,
                // internalpriority: newtada.internalpriority,
                changedate: newtada.changedate,
                status: newtada.status,
                slaAction: sla_action,
                cduiincidentlog: cdui_incidentlog,
                creationdate: newtada.creationdate,
                targetfinish: newtada.targetfinish,
                long_description: newtada.long_description,
                owner: newtada.owner,
                ownergroup: newtada.ownergroup,
                class_maxvalue: newtada.class_maxvalue,
                ticketuid: newtada.ticketuid,
                class_description: newtada.class_description,
                isglobal: isGlobalText,
                isglobalValue: newtada.isglobal,
                createdby: newtada.createdby
            })
            wodetailsDS.load({ src: newSRCds });            
        }).catch((err) => {
            // handle error
            console.log("error", err)
        })

    }

    renderActivityLogData(newtada) {
        let selfnew = this;
        if (newtada.classstructureid) {
            selfnew.myticketclassStructure(newtada.classstructureid)
        }
        let isEndUser = false;
        let prevLogOwner = null;
        let prevLogGroup = null;
        let ticketId = newtada.ticketid
        let prevLogStatus = null;
        // let reportedbyUserid = newtada.createdby
        //    let detailLimit = 100;
        let affectedUserid = newtada.createdby

        let self = this;
        // Fixed defect 133980 
        // Sometimes Showing Status Changed from-to in capital and Sometimes Showing Changes status from-to  in small
        let items = this.getActivityLogStatus(newtada.class_maxvalue)
        function valueToDescription(value) {
            for (var i = 0; i < items.length; i++) {
                // if (items[i].value === value) return (items[i].locale_description || items[i].description);
                if (items[i].value === value) return (items[i].description);
            }
            return value;
        }
        var reportedbyUserid = (newtada.reporterPerson && newtada.reporterPerson.userid) || newtada.reportedby || newtada.createdby;
        let relatedChildDS = this.app.findDatasource('modifiedactivitylogs');
        let relatedChildDS1 = this.app.findDatasource('activityLogDS').forceReload().then(item => {
            let tdata = item;
            let newSRC = []
            let self1 = this;
            if (newtada.creationdate) {
                tdata.unshift({
                    changeby: reportedbyUserid,
                    changedate: newtada.creationdate,
                    newvalue: newtada.class.toUpperCase(),
                    recordtype: 'CREATIONDATE'
                });
            }
            tdata.forEach((log, index) => {
                if (log && (log.recordtype !== 'WORKLOG' || !isEndUser || log.clientviewable === true)) {
                    var result = {
                        recordtype: log.recordtype.toLowerCase(),
                        changedate: log.changedate,
                        title: "Default",
                        details: "",
                        recordid: log.recordid,
                        clientviewable: log.clientviewable,
                        _id: index,
                        _bulkid: index + 1
                    };
                    switch (log.recordtype.toUpperCase()) {
                        case "COMMLOG":

                            var chat = (log.changeby === 'MXINTADM');

                            if (chat) {
                                result.title = self1.app.getLocalizedLabel('chat_session', 'Chat session'),
                                    result.glyphiconClass = chattranscripticon;
                            } else {
                                if (log.inbound === "1") {
                                    result.title = self1.app.getLocalizedLabel('email_to', `Email to ${(log.changeby)}`, [log.changeby])
                                } else {
                                    result.title = self1.app.getLocalizedLabel('email_from', `Email from ${(log.changeby)}`, [log.changeby])
                                }
                                //  Email scenario not tested

                                // for (var i = 0; i < logEmailMapping.length; i++) {
                                //     var type = logEmailMapping[i].type;
                                //     if (log[type]) {
                                //         var text = logEmailMapping[i].text;
                                //         result.details += $translate.instant(text, {
                                //             'user': "<a href='mailto:" + log[type] + "'>" + log[type] + "</a>"
                                //         });
                                //         result.details += "<br />";
                                //     }
                                // }

                                result.glyphiconClass = emailimage;
                            }

                            result.details = self1.app.getLocalizedLabel('subject', `Subject: ${(log.newvalue)}`, [log.newvalue]);
                            result.details += '\n'
                            result.details += log.ldtext.replaceAll("<br />", ", ");

                            // code to replace , with . at last index
                            let lastindex = result.details.slice(-2)

                            if (lastindex === ', ') {
                                var str = result.details;
                                var strReplacedWith = ".";
                                var currentIndex = str.lastIndexOf(",");
                                str = str.substring(0, currentIndex) + strReplacedWith + str.substring(currentIndex + 1, str.length);

                                result.details = str;

                            }
                            break;
                        case "OWNER":
                            if (!isEndUser && (prevLogOwner !== log.newvalue)) {
                                if (!log.newvalue) {
                                    result.title = self1.app.getLocalizedLabel('owner_removed', 'Owner removed')
                                    result.details = self1.app.getLocalizedLabel('owner_removed_by', `Owner ${(prevLogOwner)} removed by  ${(log.changeby)}`, [prevLogOwner, log.changeby])
                                } else {
                                    result.title = self1.app.getLocalizedLabel('owner_changed', `Owner changed to ${(log.newvalue)}`, [log.newvalue])
                                    if (!prevLogOwner) {
                                        result.details = self1.app.getLocalizedLabel('owner_changed_by', `Owner changed to ${(log.newvalue)} by ${(log.changeby)}`, [log.newvalue, log.changeby])
                                    } else {
                                        result.details = self1.app.getLocalizedLabel('owner_changed_from', `Owner changed from ${(prevLogOwner)} to ${(log.newvalue)} by ${(log.changeby)}`, [prevLogOwner, log.newvalue, log.changeby])

                                    }
                                }
                                result.glyphiconClass = transferticket;
                                prevLogOwner = log.newvalue;
                            } else {
                                result = null;
                            }
                            break;
                        case "OWNERGROUP":

                            if (!isEndUser && (prevLogGroup != log.newvalue)) {
                                if (!log.newvalue) {
                                    result.title = self1.app.getLocalizedLabel('owner_removed', 'Owner removed')
                                    result.details = self1.app.getLocalizedLabel('owner_removed_by', `Owner ${(prevLogGroup)} removed by  ${(log.changeby)}`, [prevLogGroup, log.changeby])
                                } else {
                                    result.title = self1.app.getLocalizedLabel('team_changed', `Team changed to ${(log.newvalue)}`, [log.newvalue])
                                    if (!prevLogGroup) {
                                        result.details = self1.app.getLocalizedLabel('team_changed_by', `Team changed to ${(log.newvalue)} by ${(log.changeby)}`, [log.newvalue, log.changeby])
                                    } else {
                                        result.details = self1.app.getLocalizedLabel('team_changed_from', `Team changed from ${(prevLogGroup)} to ${(log.newvalue)} by ${(log.changeby)}`, [prevLogGroup, log.newvalue, log.changeby])
                                    }
                                }
                                result.glyphiconClass = transferticket;
                                prevLogGroup = log.newvalue;
                            } else {
                                result = null;
                            }
                            break;
                        case "REPORTDATE":

                            // N.B.
                            // Current log items are records of the view CDUIINCIDENTLOG
                            // Logs with 'REPORTDATE' recordtype have 'changeby' property value that has been extracted from the 'reportedby' ticket property
                            // As soon as the ticket 'reportedby' property relate to the personid value, get the current 'reportedbyUserid' value
                            if (log.newvalue === "INCIDENT") {
                                //  result.title = 'Ticket ' + ticketId + ' submitted'
                                result.title = self1.app.getLocalizedLabel('ticket_created', `Ticket ${(ticketId)} created`, [ticketId])
                                if (!isEndUser) {

                                    result.details = self1.app.getLocalizedLabel('ticket_created_by', `Ticket ${(ticketId)} created by ${(reportedbyUserid)}`, [ticketId, reportedbyUserid])
                                }
                                result.glyphiconClass = ticketcreatedimage;
                            } else {
                                result.title = self1.app.getLocalizedLabel('request_created', `Request ${(ticketId)} created`, [ticketId])
                                if (!isEndUser) {

                                    result.details = self1.app.getLocalizedLabel('request_created_by', `Request created by  ${(reportedbyUserid)} `, [reportedbyUserid])
                                }
                                result.glyphiconClass = requestcreatedimage;
                            }
                            break;
                        case "CREATIONDATE":
                            if (log.newvalue === "INCIDENT") {
                                result.title = self1.app.getLocalizedLabel('ticket_created', `Ticket ${(ticketId)} created`, [ticketId])
                                if (!isEndUser) {
                                    result.details = self1.app.getLocalizedLabel('ticket_created_by', `Ticket ${(ticketId)} created by ${(log.changeby)}`, [ticketId, log.changeby])
                                }
                                result.glyphiconClass = ticketcreatedimage;
                            } else {
                                result.title = self1.app.getLocalizedLabel('request_created', `Request ${(ticketId)} created`, [ticketId])
                                if (!isEndUser) {
                                    result.details = self1.app.getLocalizedLabel('request_created_by', `Request created by  ${(log.changeby)} `, [log.changeby])
                                }
                                result.glyphiconClass = ticketcreatedimage;
                            }
                            break;
                        case "STATUS":
                            if (prevLogStatus !== log.newvalue) {



                                var translatedStatus = valueToDescription(log.newvalue);

                                result.title = self1.app.getLocalizedLabel('status_change', `Status Change to ${(translatedStatus)}`, [translatedStatus])


                                if (!isEndUser) {

                                    if (prevLogStatus === null) {
                                        result.details = self1.app.getLocalizedLabel('status_change_to', `Status changed to ${(translatedStatus)} by ${(log.changeby)}`, [translatedStatus, log.changeby])
                                    } else {
                                        result.details = self1.app.getLocalizedLabel('status_change_from', `Status changed from ${(prevLogStatus)} to ${(translatedStatus)} by ${(log.changeby)}`, [prevLogStatus, translatedStatus, log.changeby])


                                    }
                                }

                                result.glyphiconClass = statuschagnedimage;
                                prevLogStatus = log.newvalue;

                            } else {
                                result = null;
                            }
                            console.log('Status_data', result);
                            break;
                        case "UPDATE":
                        case "WORKLOG":
                            if (log.recordtype.toUpperCase() === "UPDATE") {
                                // result.title = 'Request update by ' + log.changeby + ', user:' + log.changeby
                                result.title = self1.app.getLocalizedLabel('request_update_by', `Request update by ${(log.changeby)}`, [log.changeby])
                            } else if (!isEndUser) {
                                // result.title = 'Comment by ' + log.changeby + ', user:' + log.changeby;
                                result.title = self1.app.getLocalizedLabel('comment_by', `Comment by ${(log.changeby)}`, [log.changeby])
                            }
                            else {
                                // validate if the current user of the log is a team proxy user 
                                // && $sessionStorage.loggedUser.userid != log.changeby - for later
                                var isUserTeamProxy = log.teamproxygroup && log.teamproxygroup.length > 0;

                                if (log.changeby !== reportedbyUserid && log.changeby !== affectedUserid && self1.app.userInfo.personid != log.changeby && !isUserTeamProxy) {
                                    //don't show service desk names to end user
                                    result.title = self1.app.getLocalizedLabel('comment_by_analyst', "Comment by an ANALYST");
                                } else {
                                    result.title = self1.app.getLocalizedLabel('comment_by', `Comment by ${(log.changeby)}`, [log.changeby])
                                }
                            }


                            // set summary only if is different from the long description 
                            // in case of adding comment from SP, the summary is a result of the $filter('toSummary') processing of the long description. This summary, in case of long text, is truncated and at the end is appended '...' string.
                            // compare the summary from the api and the summary created by filtering the long description 
                            // note that the summary saved has been filtered from all formatted text like colors, links, underlying parts and so on
                            // var summaryFromLongDescr = $filter('toSummary')(log.ldtext, detailLimit).trim().toLowerCase(), 
                            var summaryFromLongDescr = "",
                                summary = log.newvalue ? log.newvalue.replace(/\.\.\.$/, '') : '';

                            result.summary = (summaryFromLongDescr.indexOf(summary.trim().toLowerCase()) >= 0) ? "" : log.newvalue;
                            // // Defect fix for 124912
                            if (!log.ldtext) {
                                log.ldtext = "";
                            }
                            // // End
                            var details = log.ldtext.split(':');
                            var charCount = log.ldtext.indexOf('.')
                            if (log.ldtext.indexOf('.') === -1) {
                                charCount = log.ldtext.indexOf('。');
                            }
                            if (details[0].trim() === self1.app.getLocalizedLabel('dashboard_resoForAffeUser__msg', `The resolution was accepted by the affected user ${(log.changeby)}. ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_resoForReportingUser__msg', `The resolution was accepted by the reporting user ${(log.changeby)}. ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_resoForTeamProxyUser__msg', `The resolution was accepted by the Team Proxy user ${(log.changeby)}. ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)])) {
                                result.details = result.summary;

                            } else if (details[0].trim() === self1.app.getLocalizedLabel('dashboard_rejectByAffeUser__msg', `The resolution was rejected by the affected user ${(log.changeby)} for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_rejectByRepoUser__msg', `The resolution was rejected by the reporting user ${(log.changeby)} for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_rejectByTeamProxyUser__msg', `The resolution was rejected by the Team Proxy user ${(log.changeby)} for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_updateByAffectedUser__msg', `Affected user ${(log.changeby)} requested a ticket update for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_updateByTeamproxyUser__msg', `Team Proxy user ${(log.changeby)} requested a ticket update for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_cancelByreportingUser__msg', `Reporting user ${(log.changeby)} cancelled the ticket for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_cancelByAffectedUser__msg', `Affected user ${(log.changeby)} cancelled the ticket for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === self1.app.getLocalizedLabel('dashboard_cancelByTeamproxyUser__msg', `Team Proxy user ${(log.changeby)} cancelled the ticket for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.changeby, log.ldtext.substr(charCount + 1)]) ||
                                details[0].trim() === log.changeby + ' ' + self1.app.getLocalizedLabel('dashboard_ticket_update_msg', `requested a ticket update for the following reason: ${(log.ldtext.substr(charCount + 1))}`, [log.ldtext.substr(charCount + 1)])
                            ) {
                                // var reason = $translate.instant(details[0], {
                                //     'user': log.changeby,
                                //     'reason': log.ldtext.split(':').slice(2).join(':')
                                // });
                                // result.details = reason;
                            } else {
                                result.details = log.ldtext;
                            }
                            //     // // Defect fix for 124912
                            if (result.details === '') {
                                result.details = result.summary;
                            }
                            //     // // End
                            result.glyphiconClass = commentsimage;
                            if (log.changeby === reportedbyUserid) {
                                result.glyphiconClass = commentbyuserimage;
                            } else {
                                result.glyphiconClass = commentsimage;
                            }
                            result.worklogid = log.recordid;


                            break;

                        case "WFTRANS":
                            //if transtype = rejected - show rejected string
                            if (isEndUser) {
                                //for end user we do NOT explose service desk personnel
                                if (log.newvalue === 'ACCEPT') {
                                    result.title = self1.app.getLocalizedLabel('request_approved', 'Request approved');
                                    result.glyphiconClass = approvedimage;
                                } else if (log.newvalue === 'REJECT') {
                                    result.title = self1.app.getLocalizedLabel('approval_denied', 'Approval denied');
                                    result.glyphiconClass = approvaldeniedimage;
                                }
                            } else {
                                //for agent view we expose the usernames
                                if (log.newvalue === 'ACCEPT') {
                                    result.title = self1.app.getLocalizedLabel('request_approved_by', `Request approved by ${(log.changeby)}`, [log.changeby]);
                                    result.glyphiconClass = checkCircleSuccess;
                                } else if (log.newvalue === 'REJECT') {
                                    result.title = self1.app.getLocalizedLabel('approval_denied_by', `Approval denied by ${(log.changeby)}`, [log.changeby]);
                                    result.glyphiconClass = checkCircleDanger;
                                }
                            }
                            break;
                        case "WFASSIGN":
                            //display WF assignment only if active
                            if (isEndUser) {
                                result.title = self1.app.getLocalizedLabel('approval_request', 'Approval requested');
                            } else {
                                result.title = self1.app.getLocalizedLabel('approval_required_from', `Approval required from ${(log.changeby)}`, [log.changeby]);
                            }
                            result.details = log.newvalue;
                            result.glyphiconClass = approvedimage;
                            break;
                        default:
                            result.title = self1.app.getLocalizedLabel('error_title', 'Error loading log title');
                            result.details = self1.app.getLocalizedLabel('error_check', 'Please check error log.');
                            result.glyphiconClass = "glyphicon glyphicon-exclamation-sign";
                            console.log("Could not map activity log: " + JSON.stringify(log));
                    }
                    if (result !== null) {
                        // result.index = i;

                        if ((result.recordtype.toUpperCase() == 'COMMLOG') && this.disableCommLog) {
                            console.log("Don't push the comm log into aaray");
                        } else {
                            // put "reportdate" log before "status changed to NEW" log and only if is reportdate is different from creationdate
                            if (result.recordtype.toUpperCase() == 'REPORTDATE' && (newSRC.length > 0 && newSRC[newSRC.length - 1].changedate == result.changedate
                                && newSRC[newSRC.length - 1].recordtype.toUpperCase() == 'STATUS' && result.changedate != newSRC[0].changedate)) {
                                console.log("In else if");
                                newSRC.splice(newSRC.length - 1, 0, result);

                            } else if (result.recordtype.toUpperCase() != 'REPORTDATE' || (result.recordtype.toUpperCase() == 'REPORTDATE' && (newSRC.length > 0 && newSRC[newSRC.length - 1].changedate != result.changedate))) {
                                // delete result['_bulkid'];                            
                                newSRC.push(result);
                                console.log("In if else if");
                            }
                        }
                    }

                }
            });
            relatedChildDS.load({ src: newSRC.reverse(), noCache: true });
        });
    }

    myticketclassStructure(classsid) {
        //   let domainId = 1089;
        let classstructureid = {
            query: {
                "oslc.select": "*",
                'oslc.where': 'classstructureid=' + classsid
            }
        }
        this.app.client.restclient.get('os/CDUICLASSSTRUCTURE', classstructureid).then(newres => {

            this.page.state.tickettype = newres.member[0].description
        })
    }

    // on primary click event to save the current loggedIn user data
    async onConfirmTakeOnwership() {
        this.app.state.pageLoading = true;
        // load the dynamic data
        let formdata = await this.loadnewds(null);
        //  getting the selected owner
        let loggedUser = this.app.userInfo;
        let user = loggedUser.personid;
        formdata.item.owner = user;
        // Defect 134033
        formdata.item.ownergroup = '';
        // Enabling the ds to save the changes 
        formdata.state.canSave = true;
        //  saving the ds
        let saveresult = await formdata.save();
        if (saveresult && saveresult.items.length > 0) {
            // populate the success message on the UI
            let label = this.app.getLocalizedLabel('ticket_details_assign_success', 'Took ownership successfully');
            this.app.toast(label, 'success', null, null, false);
            // refersh the my ticket data.      
            this.loadJsonDS();
        }
        else {
            // populate the failed message on the UI
            let label = this.app.getLocalizedLabel('ticket_details_assign_failed', 'Take ownership failed')
            this.app.toast(label, 'error', null, null, false);
        }
        this.app.state.pageLoading = false;
    }
    async loadnewds(os) {
        let client = this.app.client;
        // create the rest data adapter with default option
        let da = new RESTDataAdapter(
            {
                includeCounts: true,
                includeRefs: false,
                relativeUris: true,
                includeSchema: true,
                pageSize: 1,
                objectStructure: os ? os : this.mapClassToOs(this.page.params.class),
                select:
                    '*'
            },
            client.restclient
        );
        // initialize the data source 
        let ds = new Datasource(da, { name: 'mycustomds' });
        //  checking the data source availability
        if (!this.page.hasDatasource(ds)) {
            // register the ds to the page 
            this.page.registerDatasource(ds);
        }
        // loading the ds with unique ticketuid
        await ds.load({
            where: "ticketuid=" + this.page.params.ids
        });
        return ds;
    }
    // Mapping the class to the Object structure 
    mapClassToOs(ticketClass) {
        var OS = '';
        switch (ticketClass) {
            case 'SR':
                OS = 'CDUISR';
                break;
            case 'PROBLEM':
                OS = 'CDUIPROBLEM';
                break;
            case 'INCIDENT':
            default:
                OS = 'CDUIINCIDENT';
        }
        return OS;
    }

    async loadApp(args = {}) {
        let appName = args.appName ? args.appName : undefined;
        if (!appName) {
            appName = 'serviceview';
        }

        if (appName == 'SERVICE') {
            this.app.setCurrentPage({
                name: 'serviceinformation',
                params: { id: args.context.uniqueid, flag: 'info' },
            });
        } else {
            let options = args.options ? args.options : {};
            let context = args.context ? args.context : {};
            let switcher = AppSwitcher.get();
            await switcher.gotoApplication(appName, context, options);
        }
    }
    hideOwnedBy() {
        if (this.page.params.flag == 'unassigned_ticket') {
            this.page.state.hideOwnedBy = true;
        } else if (this.page.params.flag == 'team_tickets') {
            this.page.state.hideOwnedBy = false;
        } else {
            this.page.state.hideOwnedBy = true;
        }
    }
    goToDetails(item) {
        this.page.params.ids = item.ticketuid;
        this.page.params.class = item.relatedrecclass;
        this.app.state.pageLoading = true;
        this.loadJsonDS();
        if (this.app.state.aiEnable) {
            this.getSimilarIncidentData();
        }
        this.page.state.selectedTabIndex = 0;
    }

    getRelatedRecordMyTicket(relatedreckeyData) {
        if (relatedreckeyData && relatedreckeyData.length > 0) {
            const relatedreckeyArr = [];
            for (let index = 0; index < relatedreckeyData.length; index++) {
                // added additional check if text is a string
                // to handle the custom ticket id
                if (typeof relatedreckeyData[index].relatedreckey == "string"){
                    // added the double quotes before and after the text
                    relatedreckeyArr.push('"'+relatedreckeyData[index].relatedreckey + '"');
                } else {
                    relatedreckeyArr.push(relatedreckeyData[index].relatedreckey);
                }
            }
            let request = {
                query: {
                    "oslc.select": "*",
                    'oslc.where': 'ticketid in [' + relatedreckeyArr + ']'
                }
            }
            this.app.client.restclient.get('os/CDUIMYTICKET', request).then(res => {
                let relatedChildDS = this.app.findDatasource('relatedRecordDS');
                const relatedRecordArr = [];
                for (let j = 0; j < relatedreckeyData.length; j++) {
                    for (let index = 0; index < res.member.length; index++) {
                        if (relatedreckeyData[j].relatedreckey === res.member[index].ticketid && relatedreckeyData[j].relatedrecclass === res.member[index].class) {
                            relatedRecordArr.push({
                                relatedrecordid: relatedreckeyData[j].relatedrecordid,
                                description: res.member[index].description,
                                status: res.member[index].status,
                                internalpriority_description: res.member[index].internalpriority_description,
                                relatedtoglobal: relatedreckeyData[j].relatetype,
                                relatedreckey: res.member[index].ticketid,
                                ticketuid: res.member[index].ticketuid,
                                relatedrecclass: res.member[index].class_maxvalue,
                                relatedrecclass_description: res.member[index].class_description
                            });
                        }
                    }
                }
                relatedChildDS.load({ src: relatedRecordArr });
            })
        }
    }

    getActivityLogStatus(class_maxvalue) {
        let statusArr;
        switch (class_maxvalue) {
            case "PROBLEM":
                statusArr = this.app.state.problem_status_local;
                break;
            case "INCIDENT":
                statusArr = this.app.state.incident_status_local;
                break;
            case "SR":
            default:
                statusArr = this.app.state.ticketstatus_local;
                break;
        }
        return statusArr;
    }

    goToDetailsPage(item) {

        this.app.setCurrentPage({ name: "resolvedticketdetails", params: { 'ids': item.ticketuid, 'class': item.class_maxvalue, 'flag': this.page.params.flag, 'similarobjid': item.maxaisimilarobjid, 'objectId': this.page.params.ids } })
    }
    gosolutionpage(item) {
        this.app.setCurrentPage({ name: "solution", params: { 'id': item.solution, ticketuid: this.page.params.ids } })
    }
    
    valueToDescription(items, value) {
        for (var i = 0; i < items.length; i++) {
            if (items[i].value === value) return (items[i].description);
        }
        return value;
    }
    async getSimilarIncidentData() {    
        // reseting the possible solution datasource.
        const possibleSolutionDS = this.app.findDatasource('possibleSolutionDS');
        let dismissedIncidentDS = this.app.findDatasource('dismissedIncidentDS');
        let similarIncidentDS = this.app.findDatasource('similarIncidentDS');
        similarIncidentDS.load({src: [], noCache: true }) 
        possibleSolutionDS.load({src: [], noCache: true }) 
        dismissedIncidentDS.load({src: [], noCache: true }) 
        let aiData = {
            query: {
                'oslc.select': '*',
                'oslc.where': 'objectid='+ this.page.params.ids
                /*'maxaiinference.maxaisimilarobj.where': 'score>60'*/              
            }
          }
          
          await this.app.client.restclient.get('os/CDUIAISIMILAR', aiData).then(async resp => {
            let similarItemAIListFull = resp.member;
            console.log('AI-resp-11', resp.member);     
        let similarItemAIList = similarItemAIListFull.filter((y) => y.maxaisimilarobj);
        similarItemAIList.sort((a, b) => b.maxaisimilarobj[0].score - a.maxaisimilarobj[0].score);
        console.log('AI-resp-21', similarItemAIList);
            let objectArr = [];    
            let objectIdArr = [];        
            if (similarItemAIList.length > 0) {
                similarItemAIList.forEach((item) => {
                    if (item.maxaisimilarobj && item.maxaisimilarobj.length > 0) {
                        item.maxaisimilarobj.forEach((item1) => {
                            if (item1.similartoobjectid) {
                                objectArr.push({similartoobjectid: item1.similartoobjectid, 
                                    maxaisimilarobjid: item1.maxaisimilarobjid, skipinf: item1.skipinf,
                                    score: item1.score });
                                objectIdArr.push(item1.similartoobjectid);
                            }
                        })                        
                    }
                })
                if (objectIdArr.length > 0) {
                    this.getAIGeneratedIncidentDetail(objectIdArr, objectArr)
                }
            } 
        })        
    }

    getAIGeneratedIncidentDetail(objectIdArr, objectArr) {
        let similarIncidentDS = this.app.findDatasource('similarIncidentDS');
        let dismissedIncidentDS = this.app.findDatasource('dismissedIncidentDS');
        let possibleSolutionId = [];
        let possibleSolutionData = [];
        if (objectIdArr.length > 0) {            
            let queryOption = {
                query: {
                    'oslc.select': '*',                
                    'oslc.where': 'ticketuid in [' + objectIdArr + ']',
                    // 'savedQuery': 'searchByStatus',
                    // 'savedQueryParams':"{{'srstatus':'CLOSED,RESOLVED','incstatus':'CLOSED,RESOLVED','prstatus':'CLOSED,RESOLVED'}}",
                    // 'orderBy': "internalpriority"                
                }
            }

            this.app.client.restclient.get('os/CDUITICKET', queryOption).then(res => {
                possibleSolutionId = [];
                let isEndUser = true;
                let prevLogOwner = null;
                let prevLogGroup = null;
                let prevLogStatus = null;
                var items;

                let tdata = res.member;
                let newSRC = [];
                let dismissedIncident = [];
                for (let i = 0; i < tdata.length; i++) {
                    let maxaisimilarobj =  objectArr.filter(o => o.similartoobjectid === tdata[i].ticketuid);
                    if(tdata[i].ticketuid === maxaisimilarobj[0].similartoobjectid && !maxaisimilarobj[0].skipinf) {
                        items = this.getActivityLogStatus(tdata[i].class_maxvalue, this)
                        let sla_action = '-';
                        if (tdata[i].slarecords && tdata[i].slarecords.length > 0) {
                            if (tdata[i].slarecords[0].slacommitments && tdata[i].slarecords[0].slacommitments.length > 0) {
                                sla_action = tdata[i].slarecords[0].slacommitments[0].type
                            }
                        }                        
                        if (tdata[i].cduiincidentlog && tdata[i].cduiincidentlog.length > 0) {
                            let log = tdata[i].cduiincidentlog[0];
                            var result = {
                                title: "-",
                            };
                            if (log && log.clientviewable != 0) {
                                switch (log.recordtype.toUpperCase()) {
                                    case "COMMLOG":
    
                                        var chat = (log.changeby === 'MXINTADM');
    
                                        if (chat) {
                                            result.title = this.app.getLocalizedLabel('chat_session', 'Chat session')
                                        } else {
                                            if (log.inbound === "1") {
                                                result.title = this.app.getLocalizedLabel('email_to', `Email to ${(log.changeby)}`, [log.changeby])
                                            } else {
                                                result.title = this.app.getLocalizedLabel('email_from', `Email from ${(log.changeby)}`, [log.changeby])
                                            }
                                        }
                                        break;
                                    case "OWNER":
                                        if (!isEndUser && (prevLogOwner !== log.newvalue)) {
                                            if (!log.newvalue) {
                                                result.title = this.app.getLocalizedLabel('owner_removed', 'Owner removed')
                                            } else {
                                                result.title = this.app.getLocalizedLabel('owner_changed', `Owner changed to ${(log.newvalue)}`, [log.newvalue])
                                            }
                                        } else {
                                            result = null;
                                        }
                                        break;
                                    case "OWNERGROUP":
    
                                        if (!isEndUser && (prevLogGroup !== log.newvalue)) {
                                            if (!log.newvalue) {
                                                result.title = this.app.getLocalizedLabel('owner_removed', 'Owner removed')
                                            } else {
                                                result.title = this.app.getLocalizedLabel('team_changed', `Team changed to ${(log.newvalue)}`, [log.newvalue])
                                            }
                                        } else {
                                            result = null;
                                        }
                                        break;
                                    case "REPORTDATE":
    
                                        // N.B.
                                        // Current log items are records of the view CDUIINCIDENTLOG
                                        // Logs with 'REPORTDATE' recordtype have 'changeby' property value that has been extracted from the 'reportedby' ticket property
                                        // As soon as the ticket 'reportedby' property relate to the personid value, get the current 'tdata[i].createdby' value
                                        if (log.newvalue === "INCIDENT") {
                                            //  result.title = 'Ticket ' + item.ticketid + ' submitted'
                                            result.title = this.app.getLocalizedLabel('ticket_created', `Ticket ${(tdata[i].ticketid)} created`, [tdata[i].ticketid])
                                        } else {
                                            result.title = this.app.getLocalizedLabel('request_created', `Request ${(tdata[i].ticketid)} created`, [tdata[i].ticketid])
                                        }
                                        break;
                                    case "CREATIONDATE":
                                        if (log.newvalue === "INCIDENT") {
                                            result.title = this.app.getLocalizedLabel('ticket_created', `Ticket ${(tdata[i].ticketid)} created`, [tdata[i].ticketid])
                                        } else {
                                            result.title = this.app.getLocalizedLabel('request_created', `Request ${(tdata[i].ticketid)} created`, [tdata[i].ticketid])
                                        }
                                        break;
                                    case "STATUS":
                                        if (prevLogStatus !== log.newvalue) {
                                            var translatedStatus = this.valueToDescription(items, log.newvalue);
                                            result.title = this.app.getLocalizedLabel('status_change', `Status Change to ${(translatedStatus)}`, [translatedStatus])
                                        } else {
                                            result = null;
                                        }
                                        break;
                                    case "UPDATE":
                                    case "WORKLOG":
                                        if (log.recordtype.toUpperCase() === "UPDATE") {
                                            // result.title = 'Request update by ' + log.changeby + ', user:' + log.changeby
                                            result.title = this.app.getLocalizedLabel('request_update_by', `Request update by ${(log.changeby)}`, [log.changeby])
                                        } else if (!isEndUser) {
                                            // result.title = 'Comment by ' + log.changeby + ', user:' + log.changeby;
                                            result.title = this.app.getLocalizedLabel('comment_by', `Comment by ${(log.changeby)}`, [log.changeby])
                                        }
                                        else {
                                            // validate if the current user of the log is a team proxy user 
                                            // && $sessionStorage.loggedUser.userid != log.changeby - for later
                                            var isUserTeamProxy = log.teamproxygroup && log.teamproxygroup.length > 0;
                                            if (log.changeby !== tdata[i].createdby && log.changeby !== tdata[i].createdby && !isUserTeamProxy) {
                                                //don't show service desk names to end user
                                                result.title = this.app.getLocalizedLabel('comment_by_analyst', "Comment by an ANALYST");
                                            } else {
                                                result.title = this.app.getLocalizedLabel('comment_by', `Comment by ${(log.changeby)}`, [log.changeby])
                                            }
                                        }
                                        break;
    
                                    case "WFTRANS":
                                        //if transtype = rejected - show rejected string
                                        if (isEndUser) {
                                            //for end user we do NOT explose service desk personnel
                                            if (log.newvalue === 'ACCEPT') {
                                                result.title = this.app.getLocalizedLabel('request_approved', 'Request approved');
                                            } else if (log.newvalue === 'REJECT') {
                                                result.title = this.app.getLocalizedLabel('approval_denied', 'Approval denied');
                                            }
                                        } else {
                                            //for agent view we expose the usernames
                                            if (log.newvalue === 'ACCEPT') {
                                                result.title = this.app.getLocalizedLabel('request_approved_by', `Request approved by ${(log.changeby)}`, [log.changeby]);
                                            } else if (log.newvalue === 'REJECT') {
                                                result.title = this.app.getLocalizedLabel('approval_denied_by', `Approval denied by ${(log.changeby)}`, [log.changeby]);
                                            }
                                        }
                                        break;
                                    case "WFASSIGN":
                                        //display WF assignment only if active
                                        if (isEndUser) {
                                            result.title = this.app.getLocalizedLabel('approval_request', 'Approval requested');
                                        } else {
                                            result.title = this.app.getLocalizedLabel('approval_required_from', `Approval required from ${(log.changeby)}`, [log.changeby]);
                                        }
                                        break;
                                    default:
                                        result.title = this.app.getLocalizedLabel('error_title', 'Error loading log title');
                                        console.log("Could not map activity log: " + JSON.stringify(log));
                                }
                            }                            
                            newSRC.push({
                                ticketid: tdata[i].ticketid,
                                description: tdata[i].description ? tdata[i].description : '-',
                                internalpriority_description: tdata[i].internalpriority_description ? tdata[i].internalpriority_description : '-',
                                changedate: tdata[i].changedate,
                                latestActivity: result ? result.title : '-',
                                status: tdata[i].status ? tdata[i].status : '-',
                                slaAction: sla_action ? sla_action : '-',
                                slaDueAt: tdata[i].targetfinish,
                                ticketuid: tdata[i].ticketuid,
                                class_maxvalue: tdata[i].class_maxvalue,
                                // defect 134041
                                description_longdescription: tdata[i].description_longdescription,
                                solution: tdata[i].solution,
                                maxaisimilarobjid: maxaisimilarobj[0].maxaisimilarobjid,
                                score: maxaisimilarobj[0].score+'%',
                                similarity: this.app.getLocalizedLabel('similarity',"Similarity:")+' '+maxaisimilarobj[0].score+'%'    
                            })                           
                        }
                        else {
                            newSRC.push({
                                ticketid: tdata[i].ticketid,
                                description: tdata[i].description ? tdata[i].description : '-',
                                internalpriority_description: tdata[i].internalpriority_description ? tdata[i].internalpriority_description : '-',
                                changedate: tdata[i].changedate,
                                latestActivity: '-',
                                status: tdata[i].status ? tdata[i].status : '-',
                                slaAction: sla_action ? sla_action : '-',
                                slaDueAt: tdata[i].targetfinish,
                                ticketuid: tdata[i].ticketuid,
                                class_maxvalue: tdata[i].class_maxvalue,
                                // defect 134041
                                description_longdescription: tdata[i].description_longdescription,
                                solution: tdata[i].solution,
                                maxaisimilarobjid: maxaisimilarobj[0].maxaisimilarobjid,
                                score: maxaisimilarobj[0].score +'%',
                                similarity: this.app.getLocalizedLabel('similarity',"Similarity:")+' '+maxaisimilarobj[0].score+'%'
                            })
                        }
                        if (tdata[i].solution) {
                            possibleSolutionId.push(tdata[i].solution);
                            possibleSolutionData.push({ solution: tdata[i].solution, score: maxaisimilarobj[0].score +'%',
                            similarity: this.app.getLocalizedLabel('similarity',"Similarity:")+' '+maxaisimilarobj[0].score+'%'});
                        }
                    } else {
                        dismissedIncident.push({
                            ticketid: tdata[i].ticketid,
                            description: tdata[i].description ? tdata[i].description : '-',
                            ticketuid: tdata[i].ticketuid,
                            relatedrecclass: tdata[i].class_maxvalue,
                            maxaisimilarobjid: maxaisimilarobj[0].maxaisimilarobjid
                        })
                    }
                }
                console.log('newSRC', newSRC);
                similarIncidentDS.load({ src: newSRC, noCache: true });
                dismissedIncidentDS.load({ src: dismissedIncident, noCache: true });
                if (possibleSolutionId.length > 0) {
                    this.getPossibleSolutionData(possibleSolutionId, possibleSolutionData);
                }
            }).catch((err) => {
                // handle error
                console.log("error", err)
            })
        }
    }

    getPossibleSolutionData(possibleSolutionId, possibleSolutionData) {
        const possibleSolutionDS = this.app.findDatasource('possibleSolutionDS');
        let queryOption = {
            query: {
                'oslc.select': 'solution,description,solutionid,problemcode_longdescription,fr1code_longdescription,fr2code_longdescription',
                'oslc.pageSize': '5',
                // 'savedQuery': 'search',
                // 'orderBy': "+solutionid"   ,
                'oslc.where': 'solution in [' + possibleSolutionId + ']',
            }
        }

        this.app.client.restclient.get('os/CDUISRMSOLUTION', queryOption).then(res => {
            const possibleSolutionArr =[];
            for(let i =0; i< res.member.length; i++) {
                let maxaisimilarobj =  possibleSolutionData.filter(o => o.solution === res.member[i].solution);
                res.member[i]['score'] = maxaisimilarobj[0].score;
                res.member[i]['similarity'] = maxaisimilarobj[0].similarity 
                possibleSolutionArr.push(res.member[i]);

            }
            possibleSolutionDS.load({ src: possibleSolutionArr, noCache: true });

        })

    }


    async onClickRelateToGlobal(item) {        
        let selectedOrgList = this.app.findDatasource("globalIncidentDS").selectionManager.selectedItems;
        let selectedRelatetoGlobal = {};
        Object.keys(selectedOrgList).forEach(function eachKey(key) {
            selectedRelatetoGlobal.ticketid = selectedOrgList[key].ticketid;
            selectedRelatetoGlobal.class = selectedOrgList[key].class;
        });
        this.page.state.selectedRelatetoGlobal = selectedRelatetoGlobal;
    }

    async onclickSetAsGlobal() {
        let selectedDS = this.app.findDatasource("wodetailsDS")
        console.log('selectedDS', selectedDS.item);
        this.app.state.pageLoading = true;
        // load the dynamic data
        let formdata = await this.loadnewds('CDUITICKET');
        formdata.item.isglobal = this.page.state.togglevalue;
        if (this.page.state.selectedRelatetoGlobal && this.page.state.selectedRelatetoGlobal.ticketid) {
            // formdata.item.relatedglobaltickets = this.page.state.selectedRelatetoGlobal.ticketid;
            formdata.item.globalticketclass = this.page.state.selectedRelatetoGlobal.class;
            formdata.item.globalticketid = this.page.state.selectedRelatetoGlobal.ticketid;
            formdata.item.relatedtoglobal = true;
        }
        // Enabling the ds to save the changes 
        formdata.state.canSave = true;
        //  saving the ds
        let saveresult = await formdata.save();
        if (saveresult && saveresult.items.length > 0) {
            // populate the success message on the UI
            let label = this.app.getLocalizedLabel('set_as_global_success', `Set as global successful Incident ${(selectedDS.item.ticketid)}`, [selectedDS.item.ticketid])
            this.app.toast(label, 'success', null, null, false);
            selectedDS.item.isglobalValue = true;
            selectedDS.item.isglobal = this.app.getLocalizedLabel('ticket_detail_is_global_yes', 'Yes');
        }
        else {
            // populate the failed message on the UI
            let label = this.app.getLocalizedLabel('set_as_global_failed', 'Set as global failed')
            this.app.toast(label, 'error', null, null, false);
        }
        this.app.state.pageLoading = false;
    }
}

export default TicketDetailController;
