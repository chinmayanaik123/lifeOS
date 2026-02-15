import { Injectable } from '@angular/core';
import { Task, LocationType, LocationCondition } from '../models';

/**
 * Location Filter Service
 * Determines if a task should be shown based on current location
 */
@Injectable({
    providedIn: 'root'
})
export class LocationFilterService {
    /**
     * Check if a task is allowed at the current location
     * @param task The task to check
     * @param currentLocation The current user location
     * @returns true if the task should be shown at this location
     */
    isLocationAllowed(task: Task, currentLocation: LocationType): boolean {
        // If no location condition, task is shown everywhere
        if (!task.locationCondition) {
            return true;
        }

        const condition = task.locationCondition;

        // Check excluded locations first (takes precedence)
        if (condition.excludedLocations && condition.excludedLocations.length > 0) {
            if (condition.excludedLocations.includes(currentLocation)) {
                return false; // Location is explicitly excluded
            }
        }

        // Check allowed locations
        if (condition.allowedLocations && condition.allowedLocations.length > 0) {
            return condition.allowedLocations.includes(currentLocation);
        }

        // If no allowed locations specified but has excluded locations,
        // allow all locations except excluded ones
        return true;
    }

    /**
     * Filter a list of tasks by location
     * @param tasks Array of tasks to filter
     * @param currentLocation The current user location
     * @returns Filtered array of tasks allowed at this location
     */
    filterTasksByLocation(tasks: Task[], currentLocation: LocationType): Task[] {
        return tasks.filter(task => this.isLocationAllowed(task, currentLocation));
    }

    /**
     * Get all locations where a task is allowed
     * @param task The task to check
     * @returns Array of allowed locations
     */
    getAllowedLocations(task: Task): LocationType[] {
        const allLocations: LocationType[] = ['home', 'office', 'bengaluru', 'native', 'outside'];

        if (!task.locationCondition) {
            return allLocations;
        }

        const condition = task.locationCondition;

        // If allowed locations are specified, use them
        if (condition.allowedLocations && condition.allowedLocations.length > 0) {
            // Remove any excluded locations
            if (condition.excludedLocations && condition.excludedLocations.length > 0) {
                return condition.allowedLocations.filter(
                    loc => !condition.excludedLocations!.includes(loc)
                );
            }
            return condition.allowedLocations;
        }

        // If only excluded locations are specified, return all except excluded
        if (condition.excludedLocations && condition.excludedLocations.length > 0) {
            return allLocations.filter(loc => !condition.excludedLocations!.includes(loc));
        }

        return allLocations;
    }

    /**
     * Check if a task has location restrictions
     * @param task The task to check
     * @returns true if task has any location conditions
     */
    hasLocationRestrictions(task: Task): boolean {
        if (!task.locationCondition) {
            return false;
        }

        const condition = task.locationCondition;
        const hasAllowed = (condition.allowedLocations?.length ?? 0) > 0;
        const hasExcluded = (condition.excludedLocations?.length ?? 0) > 0;

        return hasAllowed || hasExcluded;
    }
}
