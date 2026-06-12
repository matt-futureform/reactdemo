export const BROKERAGE_GRAPH_QUERY = /* GraphQL */ `
  query BrokerageGraph($brokerageId: ID!) {
    uiapi {
      query {

        # Brokerage (Account)
        Account(where: { Id: { eq: $brokerageId } }) {
          edges {
            node {
              Id
              Name { value }
              Tier__c { value }
              GWP__c { value }
              GWP_Target__c { value }
              Relationship_Score__c { value }
              AI_Summary__c { value }

              Parent {
                Id
                Name { value }
                Tier__c { value }
                GWP__c { value }
                GWP_Target__c { value }
                Relationship_Score__c { value }
                AI_Summary__c { value }
              }

              ChildAccounts(first: 10) {
                edges {
                  node {
                    Id
                    Name { value }
                    Tier__c { value }
                    GWP__c { value }
                    GWP_Target__c { value }
                    Relationship_Score__c { value }
                    AI_Summary__c { value }
                  }
                }
              }

              # Brokers (Contacts)
              Contacts(
                first: 10
                orderBy: { LastActivityDate: { order: DESC } }
              ) {
                edges {
                  node {
                    Id
                    Name { value }
                    Title { value }
                    LastActivityDate { value }
                    Active__c { value }
                  }
                }
              }

              # Submissions (Opportunities)
              Opportunities(
                first: 20
                where: { IsClosed: { eq: false } }
                orderBy: { CreatedDate: { order: DESC } }
              ) {
                edges {
                  node {
                    Id
                    Name { value }
                    Line_of_Business__c { value }
                    Amount { value }
                    StageName { value }
                    Days_Open__c { value }
                    Owner {
                      ... on User {
                        Id
                        Name { value }
                      }
                    }
                  }
                }
              }

              # Claims (Cases)
              Cases(
                first: 20
                where: { IsClosed: { eq: false } }
                orderBy: { CreatedDate: { order: DESC } }
              ) {
                edges {
                  node {
                    Id
                    CaseNumber { value }
                    Type { value }
                    Status { value }
                    Reserve__c { value }
                  }
                }
              }
            }
          }
        }

        # Meetings — Tasks related to the Brokerage
        Task(
          where: { WhatId: { eq: $brokerageId } }
          first: 5
          orderBy: { ActivityDate: { order: DESC } }
        ) {
          edges {
            node {
              Id
              Subject { value }
              ActivityDate { value }
              Description { value }
              TaskSubtype { value }
              WhoId { value }
              Who {
                ... on Contact {
                  Id
                  Name { value }
                }
              }
            }
          }
        }

        # Brokers belonging to child brokerages of this brokerage
        # (child relationships can only be direct descendants of the root — Salesforce GraphQL limit)
        Contact(
          where: { Account: { ParentId: { eq: $brokerageId } } }
          first: 20
        ) {
          edges {
            node {
              Id
              Name { value }
              Title { value }
              LastActivityDate { value }
              Active__c { value }
              Account { Id }
            }
          }
        }

        # Submissions belonging to child brokerages
        Opportunity(
          first: 30
          where: {
            IsClosed: { eq: false }
            Account: { ParentId: { eq: $brokerageId } }
          }
          orderBy: { CreatedDate: { order: DESC } }
        ) {
          edges {
            node {
              Id
              Name { value }
              Line_of_Business__c { value }
              Amount { value }
              StageName { value }
              Days_Open__c { value }
              Account { Id }
            }
          }
        }

        # Claims belonging to child brokerages
        Case(
          first: 30
          where: {
            IsClosed: { eq: false }
            Account: { ParentId: { eq: $brokerageId } }
          }
          orderBy: { CreatedDate: { order: DESC } }
        ) {
          edges {
            node {
              Id
              CaseNumber { value }
              Type { value }
              Status { value }
              Reserve__c { value }
              Account { Id }
            }
          }
        }

      }
    }
  }
`;

export const BROKER_DETAIL_QUERY = /* GraphQL */ `
  query BrokerDetail($brokerId: ID!) {
    uiapi {
      query {
        Contact(where: { Id: { eq: $brokerId } }) {
          edges {
            node {
              Id
              Name { value }
              Title { value }
              Email { value }
              Phone { value }
              LastActivityDate { value }
              Active__c { value }
              AccountId

              # Submissions owned by this Broker
              OpportunityContactRoles(
                where: { IsPrimary: { eq: true } }
                first: 10
              ) {
                edges {
                  node {
                    Opportunity {
                      Id
                      Name { value }
                      Line_of_Business__c { value }
                      Amount { value }
                      StageName { value }
                      Days_Open__c { value }
                    }
                  }
                }
              }
            }
          }
        }

        # Meetings attended by this Broker
        Task(
          where: { WhoId: { eq: $brokerId } }
          first: 5
          orderBy: { ActivityDate: { order: DESC } }
        ) {
          edges {
            node {
              Id
              Subject { value }
              ActivityDate { value }
              Description { value }
            }
          }
        }
      }
    }
  }
`;

export const SUBMISSION_DETAIL_QUERY = /* GraphQL */ `
  query SubmissionDetail($submissionId: ID!) {
    uiapi {
      query {
        Opportunity(where: { Id: { eq: $submissionId } }) {
          edges {
            node {
              Id
              Name { value }
              Line_of_Business__c { value }
              Amount { value }
              StageName { value }
              Days_Open__c { value }
              CloseDate { value }
              Description { value }
              Owner {
                ... on User {
                  Id
                  Name { value }
                  Title { value }
                }
              }
              Account {
                Id
                Name { value }
              }
            }
          }
        }
      }
    }
  }
`;

export const CLAIM_DETAIL_QUERY = /* GraphQL */ `
  query ClaimDetail($claimId: ID!) {
    uiapi {
      query {
        Case(where: { Id: { eq: $claimId } }) {
          edges {
            node {
              Id
              CaseNumber { value }
              Subject { value }
              Type { value }
              Status { value }
              Reserve__c { value }
              Description { value }
              CreatedDate { value }
              Account {
                Id
                Name { value }
              }
              Owner {
                ... on User {
                  Id
                  Name { value }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const MEETING_DETAIL_QUERY = /* GraphQL */ `
  query MeetingDetail($meetingId: ID!) {
    uiapi {
      query {
        Task(where: { Id: { eq: $meetingId } }) {
          edges {
            node {
              Id
              Subject { value }
              ActivityDate { value }
              Description { value }
              TaskSubtype { value }
              Who {
                ... on Contact {
                  Id
                  Name { value }
                }
              }
              What {
                ... on Account {
                  Id
                  Name { value }
                }
                ... on Opportunity {
                  Id
                  Name { value }
                }
              }
            }
          }
        }
      }
    }
  }
`;
