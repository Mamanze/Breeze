﻿/// <reference path="todo.model.js"/>
window.todoApp = window.TodoApp || {};

window.todoApp.datacontext = (function (breeze) {

    var serviceName = "api/Todo"; 
    var saveOptions = new breeze.SaveOptions({ allowConcurrentSaves: true });

    var manager = new breeze.EntityManager({
            serviceName: serviceName,
            saveOptions: saveOptions
    });
    configureManagerToSaveOnModify();
    
    var metadataStore = manager.metadataStore;

    var datacontext = {
            name: "Breeze",
            metadataStore: metadataStore,
            getTodoLists: getTodoLists,
            createTodoList: createTodoList,
            createTodoItem: createTodoItem,
            saveNewTodoItem: saveNewTodoItem,
            saveNewTodoList: saveNewTodoList,
            deleteTodoItem: deleteTodoItem,
            deleteTodoList: deleteTodoList
        };

    return datacontext;
 
    // Private Members
    function getTodoLists(todoListsObservable, errorObservable) {
        return breeze.EntityQuery
            .from("TodoLists").expand("Todos")
            .using(manager).execute()
            .then(getSucceeded)
            .fail(getFailed);

        function getSucceeded(data) {
            todoListsObservable(data.results);
        }

        function getFailed(error) {
            errorObservable("Error retrieving todo lists: " + error.message);
        }
    }
    
    function createTodoItem() {
        return metadataStore.getEntityType("TodoItem").createEntity();
    }
    
    function createTodoList() {
        return metadataStore.getEntityType("TodoList").createEntity();
    }
    
    function saveNewTodoItem(todoItem) {
        return saveEntity(manager.addEntity(todoItem));
    }
    
    function saveNewTodoList(todoList) {
        return saveEntity(manager.addEntity(todoList));
    }
    
    function deleteTodoItem(todoItem) {
        todoItem.entityAspect.setDeleted();
        return saveEntity(todoItem);
    }
    
    function deleteTodoList(todoList) {       
        // breeze doesn't cascade delete so we have to do it
        var todoItems = todoList.Todos().slice(); // iterate over copy
        todoItems.forEach(function(entity) { entity.entityAspect.setDeleted(); });
        todoList.entityAspect.setDeleted();
        return saveEntity(todoList);
    }
    
    function saveEntity(masterEntity) {
        masterEntity.ErrorMessage(null);
        return manager.saveChanges().fail(saveFailed);

        function saveFailed(error) {
            setSaveErrorMessage();
            manager.rejectChanges();
            throw error; // for benefit of caller
        }

        function setSaveErrorMessage() {
            var statename = masterEntity.entityAspect.entityState.name.toLowerCase();
            var typeName = masterEntity.entityType.shortName;
            var msg = "Error saving " + statename + " " + typeName;
            masterEntity.ErrorMessage(msg);
        }
    }
    
    function configureManagerToSaveOnModify() {
        manager.entityChanged.subscribe(function (args) {
            if (args.entityAction === breeze.EntityAction.EntityStateChange) {
                var entity = args.entity;
                if (entity.entityAspect.entityState.isModified()) {
                    saveEntity(entity);
                }
            }
        });
    }
    
})(breeze);